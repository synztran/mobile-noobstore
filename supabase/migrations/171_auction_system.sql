-- Migration 171: Auction / Bidding System
-- Schema, RLS, and atomic RPC functions for NoobStore auctions

-- 1. Enums
DO $$ BEGIN
  CREATE TYPE public.auction_status AS ENUM ('draft', 'active', 'ended', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.bid_increment_type AS ENUM ('fixed', 'percentage');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Tables
CREATE TABLE IF NOT EXISTS public.auction_products (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id             TEXT NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  starting_price         NUMERIC NOT NULL CHECK (starting_price > 0),
  bin_price              NUMERIC CHECK (bin_price IS NULL OR bin_price > starting_price),

  -- Increment rule
  increment_type         public.bid_increment_type NOT NULL DEFAULT 'fixed',
  increment_value        NUMERIC NOT NULL CHECK (increment_value > 0),

  -- State
  current_price          NUMERIC NOT NULL CHECK (current_price >= starting_price),
  current_winner_id      TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  status                 public.auction_status NOT NULL DEFAULT 'draft',
  is_featured            BOOLEAN NOT NULL DEFAULT false,

  -- Eligibility rules
  required_customer_level   INT NOT NULL DEFAULT 0 CHECK (required_customer_level >= 0),
  required_order_count      INT NOT NULL DEFAULT 0 CHECK (required_order_count >= 0),
  limit_bids_per_user       BOOLEAN NOT NULL DEFAULT false,
  max_bids_per_user         INT CHECK (max_bids_per_user IS NULL OR max_bids_per_user > 0),

  -- Timing & Anti-snipe
  starts_at              TIMESTAMPTZ NOT NULL,
  ends_at                TIMESTAMPTZ NOT NULL,
  anti_snipe_minutes     INT NOT NULL DEFAULT 5 CHECK (anti_snipe_minutes >= 0),

  -- Winner settlement
  winner_checkout_hours  INT NOT NULL DEFAULT 24 CHECK (winner_checkout_hours > 0),
  max_winner_cascades    INT NOT NULL DEFAULT 3 CHECK (max_winner_cascades >= 0),
  winner_deadline        TIMESTAMPTZ,
  order_id               TEXT REFERENCES public.orders(id) ON DELETE SET NULL,

  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chk_auction_max_bids CHECK (
    limit_bids_per_user = false OR max_bids_per_user IS NOT NULL
  ),
  CONSTRAINT chk_auction_timing CHECK (
    ends_at > starts_at
  )
);

CREATE TABLE IF NOT EXISTS public.auction_bids (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id       UUID NOT NULL REFERENCES public.auction_products(id) ON DELETE CASCADE,
  user_id          TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount           NUMERIC NOT NULL CHECK (amount > 0),
  is_winning       BOOLEAN NOT NULL DEFAULT false,
  cascade_skip_at  TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_auction_products_status_ends ON public.auction_products(status, ends_at);
CREATE INDEX IF NOT EXISTS idx_auction_products_featured ON public.auction_products(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_auction_products_product_id ON public.auction_products(product_id);
CREATE INDEX IF NOT EXISTS idx_auction_products_winner ON public.auction_products(current_winner_id) WHERE current_winner_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_auction_bids_auction_amount ON public.auction_bids(auction_id, amount DESC);
CREATE INDEX IF NOT EXISTS idx_auction_bids_user ON public.auction_bids(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auction_bids_winning ON public.auction_bids(auction_id, is_winning) WHERE is_winning = true;

-- 4. Enable RLS
ALTER TABLE public.auction_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auction_bids ENABLE ROW LEVEL SECURITY;

-- Auction products: anyone can view non-draft; admins/service_role can view all
CREATE POLICY "auction_products_public_read" ON public.auction_products
  FOR SELECT USING (
    status != 'draft'
    OR (auth.jwt() ->> 'role' = 'service_role')
    OR EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()::text AND users.role = 'admin'
    )
  );

CREATE POLICY "auction_products_admin_write" ON public.auction_products
  FOR ALL USING (
    (auth.jwt() ->> 'role' = 'service_role')
    OR EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()::text AND users.role = 'admin'
    )
  );

-- Auction bids: anyone can read bids for public auctions
CREATE POLICY "auction_bids_public_read" ON public.auction_bids
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.auction_products ap
      WHERE ap.id = auction_bids.auction_id AND (
        ap.status != 'draft'
        OR (auth.jwt() ->> 'role' = 'service_role')
        OR EXISTS (
          SELECT 1 FROM public.users
          WHERE users.id = auth.uid()::text AND users.role = 'admin'
        )
      )
    )
  );

-- Only service_role and security definer functions write bids directly
CREATE POLICY "auction_bids_service_insert" ON public.auction_bids
  FOR INSERT WITH CHECK (
    (auth.jwt() ->> 'role' = 'service_role')
    OR EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()::text AND users.role = 'admin'
    )
  );

CREATE POLICY "auction_bids_admin_update" ON public.auction_bids
  FOR UPDATE USING (
    (auth.jwt() ->> 'role' = 'service_role')
    OR EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()::text AND users.role = 'admin'
    )
  );

-- 5. Realtime Publication
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.auction_bids;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.auction_products;
  END IF;
END $$;

-- 6. RPC: Place Bid (Atomic with Row-Level Lock)
CREATE OR REPLACE FUNCTION public.place_auction_bid(
  p_auction_id UUID,
  p_user_id TEXT,
  p_amount NUMERIC
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_auction public.auction_products%ROWTYPE;
  v_user_level INT := 0;
  v_user_order_count INT := 0;
  v_user_bid_count INT := 0;
  v_min_increment NUMERIC;
  v_min_next_bid NUMERIC;
  v_now TIMESTAMPTZ := clock_timestamp();
  v_new_ends_at TIMESTAMPTZ;
  v_is_extended BOOLEAN := false;
  v_bid_id UUID;
BEGIN
  IF p_auction_id IS NULL OR p_user_id IS NULL OR p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'invalid_bid_request';
  END IF;

  -- 1. Lock auction row
  SELECT * INTO v_auction
  FROM public.auction_products
  WHERE id = p_auction_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'auction_not_found';
  END IF;

  -- 2. Validate auction status and timing
  IF v_auction.status != 'active' THEN
    RAISE EXCEPTION 'auction_not_active';
  END IF;

  IF v_now < v_auction.starts_at THEN
    RAISE EXCEPTION 'auction_not_started';
  END IF;

  IF v_now >= v_auction.ends_at THEN
    RAISE EXCEPTION 'auction_ended';
  END IF;

  -- 3. Verify user existence
  PERFORM 1 FROM public.users WHERE id = p_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'user_not_found';
  END IF;

  -- 4. User cannot outbid themselves if already winning
  IF v_auction.current_winner_id = p_user_id THEN
    RAISE EXCEPTION 'already_highest_bidder';
  END IF;

  -- 5. Verify customer level eligibility
  IF v_auction.required_customer_level > 0 THEN
    SELECT COALESCE(cr.level, 0) INTO v_user_level
    FROM public.users u
    LEFT JOIN public.customer_ranks cr ON cr.id = u.rank_id
    WHERE u.id = p_user_id;

    IF v_user_level < v_auction.required_customer_level THEN
      RAISE EXCEPTION 'insufficient_customer_level';
    END IF;
  END IF;

  -- 6. Verify order count eligibility
  IF v_auction.required_order_count > 0 THEN
    SELECT COUNT(*) INTO v_user_order_count
    FROM public.orders
    WHERE user_id = p_user_id AND status NOT IN ('cancelled', 'refunded');

    IF v_user_order_count < v_auction.required_order_count THEN
      RAISE EXCEPTION 'insufficient_order_count';
    END IF;
  END IF;

  -- 7. Verify per-user bid count limit
  IF v_auction.limit_bids_per_user AND v_auction.max_bids_per_user IS NOT NULL THEN
    SELECT COUNT(*) INTO v_user_bid_count
    FROM public.auction_bids
    WHERE auction_id = p_auction_id AND user_id = p_user_id;

    IF v_user_bid_count >= v_auction.max_bids_per_user THEN
      RAISE EXCEPTION 'bid_limit_reached';
    END IF;
  END IF;

  -- 8. Compute min required next bid
  IF v_auction.increment_type = 'percentage' THEN
    v_min_increment := round((v_auction.current_price * (v_auction.increment_value / 100.0)), 0);
    IF v_min_increment < 1000 THEN
      v_min_increment := 1000;
    END IF;
  ELSE
    v_min_increment := v_auction.increment_value;
  END IF;

  -- Special case: first bid can be starting_price if no bids yet
  IF v_auction.current_winner_id IS NULL AND p_amount >= v_auction.starting_price THEN
    v_min_next_bid := v_auction.starting_price;
  ELSE
    v_min_next_bid := v_auction.current_price + v_min_increment;
  END IF;

  IF p_amount < v_min_next_bid THEN
    RAISE EXCEPTION 'bid_too_low';
  END IF;

  -- If Buy Now price is set and bid meets or exceeds it, capped at bin_price and ends auction
  IF v_auction.bin_price IS NOT NULL AND p_amount >= v_auction.bin_price THEN
    p_amount := v_auction.bin_price;
  END IF;

  -- 9. Anti-snipe extension check
  v_new_ends_at := v_auction.ends_at;
  IF v_auction.anti_snipe_minutes > 0 THEN
    IF (v_auction.ends_at - v_now) < (v_auction.anti_snipe_minutes * interval '1 minute') THEN
      v_new_ends_at := v_auction.ends_at + (v_auction.anti_snipe_minutes * interval '1 minute');
      v_is_extended := true;
    END IF;
  END IF;

  -- 10. Update previous winning bids for this auction to false
  UPDATE public.auction_bids
  SET is_winning = false
  WHERE auction_id = p_auction_id AND is_winning = true;

  -- 11. Insert new winning bid
  INSERT INTO public.auction_bids (
    auction_id,
    user_id,
    amount,
    is_winning,
    created_at
  ) VALUES (
    p_auction_id,
    p_user_id,
    p_amount,
    true,
    v_now
  ) RETURNING id INTO v_bid_id;

  -- 12. Update auction record
  IF v_auction.bin_price IS NOT NULL AND p_amount >= v_auction.bin_price THEN
    UPDATE public.auction_products
    SET
      current_price = p_amount,
      current_winner_id = p_user_id,
      status = 'ended',
      winner_deadline = v_now + (v_auction.winner_checkout_hours * interval '1 hour'),
      updated_at = v_now
    WHERE id = p_auction_id;
  ELSE
    UPDATE public.auction_products
    SET
      current_price = p_amount,
      current_winner_id = p_user_id,
      ends_at = v_new_ends_at,
      updated_at = v_now
    WHERE id = p_auction_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'bid_id', v_bid_id,
    'amount', p_amount,
    'ends_at', v_new_ends_at,
    'is_extended', v_is_extended,
    'status', CASE WHEN v_auction.bin_price IS NOT NULL AND p_amount >= v_auction.bin_price THEN 'ended' ELSE 'active' END
  );
END;
$$;

-- 7. RPC: Buy Now Auction
CREATE OR REPLACE FUNCTION public.buy_now_auction(
  p_auction_id UUID,
  p_user_id TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_auction public.auction_products%ROWTYPE;
  v_user_level INT := 0;
  v_user_order_count INT := 0;
  v_now TIMESTAMPTZ := clock_timestamp();
  v_bid_id UUID;
  v_deadline TIMESTAMPTZ;
BEGIN
  IF p_auction_id IS NULL OR p_user_id IS NULL THEN
    RAISE EXCEPTION 'invalid_buy_now_request';
  END IF;

  SELECT * INTO v_auction
  FROM public.auction_products
  WHERE id = p_auction_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'auction_not_found';
  END IF;

  IF v_auction.status != 'active' THEN
    RAISE EXCEPTION 'auction_not_active';
  END IF;

  IF v_auction.bin_price IS NULL THEN
    RAISE EXCEPTION 'bin_not_available';
  END IF;

  IF v_now < v_auction.starts_at THEN
    RAISE EXCEPTION 'auction_not_started';
  END IF;

  IF v_now >= v_auction.ends_at THEN
    RAISE EXCEPTION 'auction_ended';
  END IF;

  PERFORM 1 FROM public.users WHERE id = p_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'user_not_found';
  END IF;

  -- Eligibility check
  IF v_auction.required_customer_level > 0 THEN
    SELECT COALESCE(cr.level, 0) INTO v_user_level
    FROM public.users u
    LEFT JOIN public.customer_ranks cr ON cr.id = u.rank_id
    WHERE u.id = p_user_id;

    IF v_user_level < v_auction.required_customer_level THEN
      RAISE EXCEPTION 'insufficient_customer_level';
    END IF;
  END IF;

  IF v_auction.required_order_count > 0 THEN
    SELECT COUNT(*) INTO v_user_order_count
    FROM public.orders
    WHERE user_id = p_user_id AND status NOT IN ('cancelled', 'refunded');

    IF v_user_order_count < v_auction.required_order_count THEN
      RAISE EXCEPTION 'insufficient_order_count';
    END IF;
  END IF;

  v_deadline := v_now + (v_auction.winner_checkout_hours * interval '1 hour');

  -- Update prior winning bids
  UPDATE public.auction_bids
  SET is_winning = false
  WHERE auction_id = p_auction_id AND is_winning = true;

  -- Insert winning bid at bin_price
  INSERT INTO public.auction_bids (
    auction_id,
    user_id,
    amount,
    is_winning,
    created_at
  ) VALUES (
    p_auction_id,
    p_user_id,
    v_auction.bin_price,
    true,
    v_now
  ) RETURNING id INTO v_bid_id;

  -- Mark auction ended immediately
  UPDATE public.auction_products
  SET
    current_price = v_auction.bin_price,
    current_winner_id = p_user_id,
    status = 'ended',
    winner_deadline = v_deadline,
    updated_at = v_now
  WHERE id = p_auction_id;

  RETURN jsonb_build_object(
    'success', true,
    'bid_id', v_bid_id,
    'amount', v_auction.bin_price,
    'winner_deadline', v_deadline,
    'status', 'ended'
  );
END;
$$;

-- 8. RPC: Resolve Expired Auctions (Scheduled / Worker)
CREATE OR REPLACE FUNCTION public.resolve_expired_auctions()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_now TIMESTAMPTZ := clock_timestamp();
  v_rec RECORD;
  v_resolved_count INT := 0;
  v_results JSONB := '[]'::jsonb;
BEGIN
  FOR v_rec IN
    SELECT ap.id, ap.winner_checkout_hours, ap.current_winner_id, ap.current_price
    FROM public.auction_products ap
    WHERE ap.status = 'active' AND ap.ends_at <= v_now
    FOR UPDATE OF ap
  LOOP
    UPDATE public.auction_products
    SET
      status = 'ended',
      winner_deadline = CASE
        WHEN v_rec.current_winner_id IS NOT NULL THEN v_now + (v_rec.winner_checkout_hours * interval '1 hour')
        ELSE NULL
      END,
      updated_at = v_now
    WHERE id = v_rec.id;

    v_resolved_count := v_resolved_count + 1;
    v_results := v_results || jsonb_build_object(
      'auction_id', v_rec.id,
      'winner_id', v_rec.current_winner_id,
      'final_price', v_rec.current_price,
      'has_winner', v_rec.current_winner_id IS NOT NULL
    );
  END LOOP;

  RETURN jsonb_build_object(
    'resolved_count', v_resolved_count,
    'auctions', v_results
  );
END;
$$;

-- 9. RPC: Cascade Expired Auction Winners
CREATE OR REPLACE FUNCTION public.cascade_expired_auction_winners()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_now TIMESTAMPTZ := clock_timestamp();
  v_auction RECORD;
  v_next_bid RECORD;
  v_skipped_count INT;
  v_cascaded_count INT := 0;
  v_results JSONB := '[]'::jsonb;
BEGIN
  -- Auctions that ended, have a winner who did not checkout in time, and no order created
  FOR v_auction IN
    SELECT ap.id, ap.current_winner_id, ap.max_winner_cascades, ap.winner_checkout_hours
    FROM public.auction_products ap
    WHERE ap.status = 'ended'
      AND ap.order_id IS NULL
      AND ap.current_winner_id IS NOT NULL
      AND ap.winner_deadline IS NOT NULL
      AND ap.winner_deadline < v_now
    FOR UPDATE OF ap
  LOOP
    -- Mark current winning bid as skipped
    UPDATE public.auction_bids
    SET
      cascade_skip_at = v_now,
      is_winning = false
    WHERE auction_id = v_auction.id
      AND user_id = v_auction.current_winner_id
      AND cascade_skip_at IS NULL;

    -- Count total skips so far
    SELECT COUNT(DISTINCT user_id) INTO v_skipped_count
    FROM public.auction_bids
    WHERE auction_id = v_auction.id AND cascade_skip_at IS NOT NULL;

    IF v_skipped_count >= v_auction.max_winner_cascades THEN
      -- Exceeded cascades -> cancel auction
      UPDATE public.auction_products
      SET
        status = 'cancelled',
        current_winner_id = NULL,
        winner_deadline = NULL,
        updated_at = v_now
      WHERE id = v_auction.id;

      v_results := v_results || jsonb_build_object(
        'auction_id', v_auction.id,
        'action', 'cancelled_max_cascades',
        'previous_winner', v_auction.current_winner_id
      );
    ELSE
      -- Find next highest bidder who has not been skipped
      SELECT id, user_id, amount INTO v_next_bid
      FROM public.auction_bids
      WHERE auction_id = v_auction.id
        AND cascade_skip_at IS NULL
      ORDER BY amount DESC, created_at ASC
      LIMIT 1;

      IF NOT FOUND THEN
        -- No remaining eligible bids -> cancel auction
        UPDATE public.auction_products
        SET
          status = 'cancelled',
          current_winner_id = NULL,
          winner_deadline = NULL,
          updated_at = v_now
        WHERE id = v_auction.id;

        v_results := v_results || jsonb_build_object(
          'auction_id', v_auction.id,
          'action', 'cancelled_no_remaining_bids',
          'previous_winner', v_auction.current_winner_id
        );
      ELSE
        -- Promote next bidder
        UPDATE public.auction_bids
        SET is_winning = true
        WHERE id = v_next_bid.id;

        UPDATE public.auction_products
        SET
          current_winner_id = v_next_bid.user_id,
          current_price = v_next_bid.amount,
          winner_deadline = v_now + (v_auction.winner_checkout_hours * interval '1 hour'),
          updated_at = v_now
        WHERE id = v_auction.id;

        v_cascaded_count := v_cascaded_count + 1;
        v_results := v_results || jsonb_build_object(
          'auction_id', v_auction.id,
          'action', 'promoted_next_winner',
          'previous_winner', v_auction.current_winner_id,
          'new_winner', v_next_bid.user_id,
          'new_price', v_next_bid.amount
        );
      END IF;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'cascaded_count', v_cascaded_count,
    'cascades', v_results
  );
END;
$$;

-- 10. Security Grants
REVOKE EXECUTE ON FUNCTION public.place_auction_bid(UUID, TEXT, NUMERIC) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.place_auction_bid(UUID, TEXT, NUMERIC) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.buy_now_auction(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.buy_now_auction(UUID, TEXT) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.resolve_expired_auctions() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_expired_auctions() TO service_role;

REVOKE EXECUTE ON FUNCTION public.cascade_expired_auction_winners() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cascade_expired_auction_winners() TO service_role;
