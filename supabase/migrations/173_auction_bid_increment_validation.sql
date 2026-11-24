-- Require submitted bid amounts to follow the auction's configured increment.
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

  SELECT * INTO v_auction
  FROM public.auction_products
  WHERE id = p_auction_id
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'auction_not_found'; END IF;
  IF v_auction.status != 'active' THEN RAISE EXCEPTION 'auction_not_active'; END IF;
  IF v_now < v_auction.starts_at THEN RAISE EXCEPTION 'auction_not_started'; END IF;
  IF v_now >= v_auction.ends_at THEN RAISE EXCEPTION 'auction_ended'; END IF;

  PERFORM 1 FROM public.users WHERE id = p_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'user_not_found'; END IF;

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
  IF v_auction.current_winner_id = p_user_id THEN
    RAISE EXCEPTION 'already_highest_bidder';
  END IF;

  IF v_auction.limit_bids_per_user AND v_auction.max_bids_per_user IS NOT NULL THEN
    SELECT COUNT(*) INTO v_user_bid_count
    FROM public.auction_bids
    WHERE auction_id = p_auction_id AND user_id = p_user_id;
    IF v_user_bid_count >= v_auction.max_bids_per_user THEN
      RAISE EXCEPTION 'bid_limit_reached';
    END IF;
  END IF;

  IF v_auction.increment_type = 'percentage' THEN
    v_min_increment := GREATEST(1000, round(v_auction.current_price * (v_auction.increment_value / 100.0), 0));
  ELSE
    v_min_increment := v_auction.increment_value;
  END IF;

  IF v_auction.current_winner_id IS NULL AND p_amount >= v_auction.starting_price THEN
    v_min_next_bid := v_auction.starting_price;
  ELSE
    v_min_next_bid := v_auction.current_price + v_min_increment;
  END IF;

  IF p_amount < v_min_next_bid THEN RAISE EXCEPTION 'bid_too_low'; END IF;
  IF (v_auction.bin_price IS NULL OR p_amount < v_auction.bin_price)
    AND (v_auction.current_winner_id IS NOT NULL OR v_min_next_bid != v_auction.starting_price)
    AND (p_amount - v_min_next_bid) % v_min_increment != 0
  THEN
    RAISE EXCEPTION 'bid_increment_invalid';
  END IF;

  -- A bid at or above BIN is accepted as a buy-now bid; server caps it at BIN below.
  IF v_auction.bin_price IS NOT NULL AND p_amount >= v_auction.bin_price THEN
    p_amount := v_auction.bin_price;
  END IF;

  v_new_ends_at := v_auction.ends_at;
  IF v_auction.anti_snipe_minutes > 0
    AND (v_auction.ends_at - v_now) < (v_auction.anti_snipe_minutes * interval '1 minute')
  THEN
    v_new_ends_at := v_auction.ends_at + (v_auction.anti_snipe_minutes * interval '1 minute');
    v_is_extended := true;
  END IF;

  UPDATE public.auction_bids SET is_winning = false
  WHERE auction_id = p_auction_id AND is_winning = true;

  INSERT INTO public.auction_bids (auction_id, user_id, amount, is_winning, created_at)
  VALUES (p_auction_id, p_user_id, p_amount, true, v_now)
  RETURNING id INTO v_bid_id;

  IF v_auction.bin_price IS NOT NULL AND p_amount >= v_auction.bin_price THEN
    UPDATE public.auction_products
    SET current_price = p_amount, current_winner_id = p_user_id, status = 'ended',
        winner_deadline = v_now + (v_auction.winner_checkout_hours * interval '1 hour'), updated_at = v_now
    WHERE id = p_auction_id;
  ELSE
    UPDATE public.auction_products
    SET current_price = p_amount, current_winner_id = p_user_id, ends_at = v_new_ends_at, updated_at = v_now
    WHERE id = p_auction_id;
  END IF;

  RETURN jsonb_build_object(
    'bid_id', v_bid_id,
    'amount', p_amount,
    'ends_at', v_new_ends_at,
    'is_extended', v_is_extended,
    'status', CASE WHEN v_auction.bin_price IS NOT NULL AND p_amount >= v_auction.bin_price THEN 'ended' ELSE 'active' END
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.place_auction_bid(UUID, TEXT, NUMERIC) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.place_auction_bid(UUID, TEXT, NUMERIC) TO authenticated, service_role;
