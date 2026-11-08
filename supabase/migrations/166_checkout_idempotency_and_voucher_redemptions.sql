-- Idempotent authenticated checkout and atomic voucher usage accounting.
BEGIN;

CREATE TABLE IF NOT EXISTS public.checkout_idempotency (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  idempotency_key uuid NOT NULL,
  request_hash text NOT NULL CHECK (request_hash ~ '^[0-9a-f]{64}$'),
  response jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, idempotency_key)
);
ALTER TABLE public.checkout_idempotency ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.checkout_idempotency FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.checkout_idempotency TO service_role;

CREATE TABLE IF NOT EXISTS public.voucher_redemptions (
  order_id text NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  voucher_id text NOT NULL REFERENCES public.vouchers(id) ON DELETE RESTRICT,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  redeemed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (order_id, voucher_id)
);
CREATE INDEX IF NOT EXISTS voucher_redemptions_user_voucher_idx
  ON public.voucher_redemptions (user_id, voucher_id);
ALTER TABLE public.voucher_redemptions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.voucher_redemptions FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.voucher_redemptions TO service_role;

-- Backfill known primary-voucher redemptions. Older multi-voucher orders only
-- have an optional JSON snapshot; do not guess or double-count those records.
INSERT INTO public.voucher_redemptions (order_id, voucher_id, user_id, redeemed_at)
SELECT o.id, o.voucher_id, u.id, coalesce(o.created_at, now())
FROM public.orders o
JOIN auth.users u ON u.id::text = o.user_id::text
WHERE o.voucher_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- Continue maintaining the historical total counter for quick-order and admin
-- paths that still use increment_voucher_used_count; checkout RPC writes both.
CREATE OR REPLACE FUNCTION public.increment_voucher_used_count(p_voucher_id text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.vouchers SET used_count = used_count + 1, updated_at = now()
  WHERE id = p_voucher_id AND deleted_at IS NULL AND status = 'active'
    AND (usage_limit_total IS NULL OR used_count < usage_limit_total);
  IF NOT FOUND THEN
    RAISE EXCEPTION 'CHECKOUT_VOUCHER_UNAVAILABLE: Voucher is invalid or usage limit exceeded'
      USING ERRCODE = 'P0001', DETAIL = 'code=CHECKOUT_VOUCHER_UNAVAILABLE';
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.increment_voucher_used_count(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_voucher_used_count(text) TO service_role;

CREATE OR REPLACE FUNCTION public.get_checkout_idempotent_response(
  p_user_id uuid, p_idempotency_key uuid
) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT response || jsonb_build_object('request_hash', request_hash, 'replayed', true)
  FROM public.checkout_idempotency
  WHERE user_id = p_user_id AND idempotency_key = p_idempotency_key
    AND coalesce(auth.role(), '') = 'service_role'
$$;
REVOKE ALL ON FUNCTION public.get_checkout_idempotent_response(uuid, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_checkout_idempotent_response(uuid, uuid) TO service_role;

-- Stable stock errors for submit_order, called atomically by the checkout RPC.
CREATE OR REPLACE FUNCTION public.submit_order(
  p_order_id      UUID,
  p_user_id       UUID,
  p_order_number  TEXT,
  p_total_price   NUMERIC,
  p_shipping_cost NUMERIC,
  p_items         JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_item          JSONB;
  v_comp          JSONB;
  v_parent_qty    INTEGER;
  v_comp_qty      INTEGER;
  v_total_req     INTEGER;
  v_avail         INTEGER;
  v_item_name     TEXT;
  v_product_type  TEXT;
  v_order_item_id UUID;
BEGIN
  FOR v_item IN SELECT * FROM jsonb_array_elements(COALESCE(p_items, '[]'::JSONB)) LOOP
    v_parent_qty := (v_item->>'quantity')::INTEGER;
    SELECT p.stock_quantity, p.name, p.product_type
      INTO v_avail, v_item_name, v_product_type
      FROM public.products p
     WHERE p.id = (v_item->>'product_id')::TEXT
       FOR UPDATE;

    IF v_avail IS NULL THEN
      RAISE EXCEPTION 'CHECKOUT_PRODUCT_NOT_FOUND: Product is unavailable'
        USING ERRCODE = 'P0001', DETAIL = 'code=CHECKOUT_PRODUCT_NOT_FOUND';
    END IF;
    IF COALESCE(v_product_type, 'standard') <> 'kit' AND v_avail < v_parent_qty THEN
      RAISE EXCEPTION 'CHECKOUT_STOCK_UNAVAILABLE: Product stock is insufficient'
        USING ERRCODE = 'P0001', DETAIL = 'code=CHECKOUT_STOCK_UNAVAILABLE';
    END IF;

    FOR v_comp IN SELECT * FROM jsonb_array_elements(COALESCE(v_item->'components', '[]'::JSONB)) LOOP
      v_comp_qty := COALESCE((v_comp->>'quantity')::INTEGER, 1);
      v_total_req := v_parent_qty * v_comp_qty;
      SELECT pv.stock_quantity INTO v_avail
        FROM public.product_variants pv
       WHERE pv.id = (v_comp->>'variant_id')::TEXT
         FOR UPDATE;
      IF v_avail IS NULL THEN
        RAISE EXCEPTION 'CHECKOUT_VARIANT_NOT_FOUND: Product variant is unavailable'
          USING ERRCODE = 'P0001', DETAIL = 'code=CHECKOUT_VARIANT_NOT_FOUND';
      END IF;
      IF v_avail < v_total_req THEN
        RAISE EXCEPTION 'CHECKOUT_STOCK_UNAVAILABLE: Product variant stock is insufficient'
          USING ERRCODE = 'P0001', DETAIL = 'code=CHECKOUT_STOCK_UNAVAILABLE';
      END IF;
    END LOOP;
  END LOOP;

  FOR v_item IN SELECT * FROM jsonb_array_elements(COALESCE(p_items, '[]'::JSONB)) LOOP
    v_parent_qty := (v_item->>'quantity')::INTEGER;
    SELECT p.product_type INTO v_product_type
      FROM public.products p WHERE p.id = (v_item->>'product_id')::TEXT;
    IF COALESCE(v_product_type, 'standard') <> 'kit' THEN
      UPDATE public.products SET stock_quantity = stock_quantity - v_parent_qty
       WHERE id = (v_item->>'product_id')::TEXT;
    END IF;
    FOR v_comp IN SELECT * FROM jsonb_array_elements(COALESCE(v_item->'components', '[]'::JSONB)) LOOP
      v_comp_qty := COALESCE((v_comp->>'quantity')::INTEGER, 1);
      v_total_req := v_parent_qty * v_comp_qty;
      UPDATE public.product_variants SET stock_quantity = stock_quantity - v_total_req
       WHERE id = (v_comp->>'variant_id')::TEXT;
    END LOOP;
  END LOOP;

  INSERT INTO public.orders (id, user_id, order_number, status, total_price, shipping_fee)
  VALUES (p_order_id, p_user_id, p_order_number, 'pending', p_total_price, p_shipping_cost);

  FOR v_item IN SELECT * FROM jsonb_array_elements(COALESCE(p_items, '[]'::JSONB)) LOOP
    v_order_item_id := gen_random_uuid();
    INSERT INTO public.order_items (id, order_id, product_id, product_name, unit_price, thumbnail, quantity)
    VALUES (
      v_order_item_id, p_order_id, v_item->>'product_id', v_item->>'product_name',
      (v_item->>'unit_price')::NUMERIC, NULLIF(v_item->>'thumbnail', ''),
      (v_item->>'quantity')::INTEGER
    );
    FOR v_comp IN SELECT * FROM jsonb_array_elements(COALESCE(v_item->'components', '[]'::JSONB)) LOOP
      INSERT INTO public.order_item_components (
        order_item_id, variant_id, variant_name, component_group, price_adjustment, thumbnail
      ) VALUES (
        v_order_item_id, v_comp->>'variant_id', v_comp->>'variant_name',
        v_comp->>'component_group', COALESCE((v_comp->>'price_adjustment')::NUMERIC, 0),
        NULLIF(v_comp->>'thumbnail', '')
      );
    END LOOP;
  END LOOP;

  RETURN jsonb_build_object(
    'order_id', p_order_id::TEXT,
    'order_number', p_order_number,
    'status', 'pending'
  );
END;
$$;
REVOKE ALL ON FUNCTION public.submit_order(uuid, uuid, text, numeric, numeric, jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_order(uuid, uuid, text, numeric, numeric, jsonb)
  TO service_role;

-- Mirror already-counted historic primary redemptions into their normalized
-- ledger; this preserves total counts without incrementing vouchers.used_count.
CREATE OR REPLACE FUNCTION public.submit_order_with_checkout(
  p_order_id uuid,
  p_user_id uuid,
  p_order_number text,
  p_total_price numeric,
  p_shipping_cost numeric,
  p_items jsonb,
  p_gift_items jsonb,
  p_idempotency_key uuid,
  p_request_hash text,
  p_vouchers jsonb,
  p_voucher_discount_amount numeric,
  p_shipping_discount_amount numeric,
  p_voucher_snapshot jsonb,
  p_gift_items_snapshot jsonb
) RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  existing public.checkout_idempotency%ROWTYPE;
  v_voucher jsonb;
  voucher_row public.vouchers;
  result jsonb;
  primary_voucher_id text;
  primary_voucher_code text;
  v_now timestamptz := now();
BEGIN
  IF p_user_id IS NULL OR p_idempotency_key IS NULL
     OR p_request_hash !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'CHECKOUT_INVALID_IDEMPOTENCY: Invalid checkout idempotency input'
      USING ERRCODE = '22023', DETAIL = 'code=CHECKOUT_INVALID_IDEMPOTENCY';
  END IF;
  IF coalesce(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'CHECKOUT_FORBIDDEN: Service role required'
      USING ERRCODE = '42501', DETAIL = 'code=CHECKOUT_FORBIDDEN';
  END IF;
  IF jsonb_typeof(coalesce(p_vouchers, '[]'::jsonb)) <> 'array'
     OR jsonb_typeof(coalesce(p_gift_items, '[]'::jsonb)) <> 'array' THEN
    RAISE EXCEPTION 'CHECKOUT_INVALID_PAYLOAD: Voucher and gift values must be arrays'
      USING ERRCODE = '22023', DETAIL = 'code=CHECKOUT_INVALID_PAYLOAD';
  END IF;

  -- Serialize same-key requests before any stock/quota mutation. The advisory
  -- lock is transaction-scoped; the unique row is the durable invariant.
  PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text || ':' || p_idempotency_key::text, 0));
  SELECT * INTO existing FROM public.checkout_idempotency
  WHERE user_id = p_user_id AND idempotency_key = p_idempotency_key;
  IF FOUND THEN
    IF existing.request_hash <> p_request_hash THEN
      RAISE EXCEPTION 'CHECKOUT_IDEMPOTENCY_CONFLICT: Idempotency key reused with different checkout payload'
        USING ERRCODE = '23505', DETAIL = 'code=CHECKOUT_IDEMPOTENCY_CONFLICT';
    END IF;
    RETURN existing.response || jsonb_build_object('replayed', true);
  END IF;

  -- Lock vouchers in stable ID order, then enforce quota against the normalized
  -- redemption ledger. The locks serialize total and per-user quota decisions.
  FOR v_voucher IN
    SELECT value FROM jsonb_array_elements(coalesce(p_vouchers, '[]'::jsonb))
    ORDER BY value->>'voucher_id'
  LOOP
    SELECT * INTO voucher_row FROM public.vouchers
    WHERE id = v_voucher->>'voucher_id' FOR UPDATE;
  IF NOT FOUND OR voucher_row.status <> 'active' OR voucher_row.deleted_at IS NOT NULL
       OR (voucher_row.start_at IS NOT NULL AND voucher_row.start_at > v_now)
       OR (voucher_row.end_at IS NOT NULL AND voucher_row.end_at < v_now) THEN
      RAISE EXCEPTION 'CHECKOUT_VOUCHER_UNAVAILABLE: Voucher is inactive, expired, or not started'
        USING ERRCODE = 'P0001', DETAIL = 'code=CHECKOUT_VOUCHER_UNAVAILABLE';
    END IF;
    IF coalesce(cardinality(voucher_row.customer_ids), 0) > 0
       AND NOT (p_user_id::text = ANY(voucher_row.customer_ids)) THEN
      RAISE EXCEPTION 'CHECKOUT_VOUCHER_UNAVAILABLE: Voucher is not assigned to this customer'
        USING ERRCODE = 'P0001', DETAIL = 'code=CHECKOUT_VOUCHER_UNAVAILABLE';
    END IF;
    IF voucher_row.usage_limit_total IS NOT NULL AND
       (SELECT count(*) FROM public.voucher_redemptions WHERE voucher_id = voucher_row.id)
         >= voucher_row.usage_limit_total THEN
      RAISE EXCEPTION 'CHECKOUT_VOUCHER_LIMIT_EXCEEDED: Voucher total usage limit exceeded'
        USING ERRCODE = 'P0001', DETAIL = 'code=CHECKOUT_VOUCHER_LIMIT_EXCEEDED';
    END IF;
  IF voucher_row.usage_limit_per_user IS NOT NULL AND
        (SELECT count(*) FROM public.voucher_redemptions
         WHERE voucher_id = voucher_row.id AND user_id = p_user_id)
         >= voucher_row.usage_limit_per_user THEN
      RAISE EXCEPTION 'CHECKOUT_VOUCHER_LIMIT_EXCEEDED: Voucher per-user usage limit exceeded'
        USING ERRCODE = 'P0001', DETAIL = 'code=CHECKOUT_VOUCHER_LIMIT_EXCEEDED';
    END IF;
  END LOOP;

  IF jsonb_array_length(coalesce(p_vouchers, '[]'::jsonb)) > 0 THEN
    primary_voucher_id := (SELECT value->>'voucher_id'
      FROM jsonb_array_elements(p_vouchers) WITH ORDINALITY AS v(value, ord) ORDER BY ord LIMIT 1);
    primary_voucher_code := (SELECT value->>'voucher_code'
      FROM jsonb_array_elements(p_vouchers) WITH ORDINALITY AS v(value, ord) ORDER BY ord LIMIT 1);
  END IF;

  IF jsonb_array_length(coalesce(p_gift_items, '[]'::jsonb)) > 0 THEN
    -- Avoid invoking the gift wrapper's public-facing grants from inside this
    -- service-only wrapper: reserve gift stock and create rows inline.
    PERFORM public.submit_order(p_order_id, p_user_id, p_order_number,
      p_total_price, p_shipping_cost, p_items);
    FOR v_voucher IN SELECT value FROM jsonb_array_elements(p_gift_items) LOOP
      IF NULLIF(v_voucher->>'variant_id', '') IS NOT NULL THEN
        UPDATE public.product_variants SET stock_quantity = stock_quantity - (v_voucher->>'quantity')::integer
        WHERE id::text = v_voucher->>'variant_id'
          AND stock_quantity >= (v_voucher->>'quantity')::integer;
        IF NOT FOUND THEN
          RAISE EXCEPTION 'CHECKOUT_GIFT_STOCK_UNAVAILABLE: Gift variant unavailable'
            USING ERRCODE = 'P0001', DETAIL = 'code=CHECKOUT_GIFT_STOCK_UNAVAILABLE';
        END IF;
        INSERT INTO public.order_items(id, order_id, product_id, product_name, unit_price,
          thumbnail, quantity, variant_id, is_pre_order, pre_order_config)
        SELECT gen_random_uuid(), p_order_id, p.id::text, p.name || ' — ' || pv.variant_name,
          0, coalesce(pv.thumbnail, p.thumbnail), (v_voucher->>'quantity')::integer,
          pv.id::text, false, null
        FROM public.product_variants pv JOIN public.products p ON p.id = pv.product_id
        WHERE pv.id::text = v_voucher->>'variant_id';
      ELSE
        UPDATE public.products SET stock_quantity = stock_quantity - (v_voucher->>'quantity')::integer
        WHERE id::text = v_voucher->>'product_id'
          AND product_type <> 'kit' AND stock_quantity >= (v_voucher->>'quantity')::integer;
        IF NOT FOUND THEN
          RAISE EXCEPTION 'CHECKOUT_GIFT_STOCK_UNAVAILABLE: Gift product unavailable'
            USING ERRCODE = 'P0001', DETAIL = 'code=CHECKOUT_GIFT_STOCK_UNAVAILABLE';
        END IF;
        INSERT INTO public.order_items(id, order_id, product_id, product_name, unit_price,
          thumbnail, quantity, variant_id, is_pre_order, pre_order_config)
        SELECT gen_random_uuid(), p_order_id, id::text, name, 0, thumbnail,
          (v_voucher->>'quantity')::integer, null, false, null
        FROM public.products WHERE id::text = v_voucher->>'product_id';
      END IF;
    END LOOP;
    result := jsonb_build_object('order_id', p_order_id::text,
      'order_number', p_order_number, 'status', 'pending');
  ELSE
    result := public.submit_order(
      p_order_id, p_user_id, p_order_number, p_total_price,
      p_shipping_cost, p_items
    );
  END IF;

  UPDATE public.orders SET
    voucher_id = primary_voucher_id,
    voucher_code = primary_voucher_code,
    voucher_discount_amount = coalesce(p_voucher_discount_amount, 0),
    shipping_discount_amount = coalesce(p_shipping_discount_amount, 0),
    voucher_snapshot = p_voucher_snapshot,
    gift_items_snapshot = p_gift_items_snapshot
  WHERE id = p_order_id;

  FOR v_voucher IN
    SELECT value FROM jsonb_array_elements(coalesce(p_vouchers, '[]'::jsonb))
    ORDER BY value->>'voucher_id'
  LOOP
    INSERT INTO public.voucher_redemptions(order_id, voucher_id, user_id)
    VALUES (p_order_id, v_voucher->>'voucher_id', p_user_id);
    UPDATE public.vouchers SET used_count = used_count + 1, updated_at = v_now
    WHERE id = v_voucher->>'voucher_id';
  END LOOP;

  INSERT INTO public.checkout_idempotency(user_id, idempotency_key, request_hash, response)
  VALUES (p_user_id, p_idempotency_key, p_request_hash, result);
  RETURN result || jsonb_build_object('replayed', false);
END;
$$;

REVOKE ALL ON FUNCTION public.submit_order_with_checkout(uuid, uuid, text, numeric, numeric, jsonb, jsonb, uuid, text, jsonb, numeric, numeric, jsonb, jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_order_with_checkout(uuid, uuid, text, numeric, numeric, jsonb, jsonb, uuid, text, jsonb, numeric, numeric, jsonb, jsonb)
  TO service_role;

COMMIT;
