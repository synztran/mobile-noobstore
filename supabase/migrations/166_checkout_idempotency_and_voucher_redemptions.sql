-- Idempotent authenticated checkout and atomic voucher usage accounting.
BEGIN;

CREATE TABLE public.checkout_idempotency (
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

CREATE TABLE public.voucher_redemptions (
  order_id text NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  voucher_id text NOT NULL REFERENCES public.vouchers(id) ON DELETE RESTRICT,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  redeemed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (order_id, voucher_id)
);
CREATE INDEX voucher_redemptions_user_voucher_idx
  ON public.voucher_redemptions (user_id, voucher_id);
ALTER TABLE public.voucher_redemptions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.voucher_redemptions FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.voucher_redemptions TO service_role;

-- Backfill known primary-voucher redemptions. Older multi-voucher orders only
-- have an optional JSON snapshot; do not guess or double-count those records.
INSERT INTO public.voucher_redemptions (order_id, voucher_id, user_id, redeemed_at)
SELECT o.id, o.voucher_id, o.user_id, coalesce(o.created_at, now())
FROM public.orders o
WHERE o.user_id IS NOT NULL AND o.voucher_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- Continue maintaining the historical total counter for quick-order and admin
-- paths that still use increment_voucher_used_count; checkout RPC writes both.
CREATE OR REPLACE FUNCTION public.increment_voucher_used_count(p_voucher_id text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.vouchers SET used_count = used_count + 1, updated_at = now()
  WHERE id = p_voucher_id AND deleted_at IS NULL AND status = 'active'
    AND (usage_limit_total IS NULL OR used_count < usage_limit_total);
  IF NOT FOUND THEN RAISE EXCEPTION 'Voucher is invalid or usage limit exceeded: %', p_voucher_id; END IF;
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
    RAISE EXCEPTION 'Invalid checkout idempotency input' USING ERRCODE = '22023';
  END IF;
  IF coalesce(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;
  IF jsonb_typeof(coalesce(p_vouchers, '[]'::jsonb)) <> 'array'
     OR jsonb_typeof(coalesce(p_gift_items, '[]'::jsonb)) <> 'array' THEN
    RAISE EXCEPTION 'Invalid checkout arrays' USING ERRCODE = '22023';
  END IF;

  -- Serialize same-key requests before any stock/quota mutation. The advisory
  -- lock is transaction-scoped; the unique row is the durable invariant.
  PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text || ':' || p_idempotency_key::text, 0));
  SELECT * INTO existing FROM public.checkout_idempotency
  WHERE user_id = p_user_id AND idempotency_key = p_idempotency_key;
  IF FOUND THEN
    IF existing.request_hash <> p_request_hash THEN
      RAISE EXCEPTION 'Idempotency key reused with different checkout payload' USING ERRCODE = '23505';
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
      RAISE EXCEPTION 'Voucher unavailable' USING ERRCODE = 'P0001';
    END IF;
    IF coalesce(cardinality(voucher_row.customer_ids), 0) > 0
       AND NOT (p_user_id::text = ANY(voucher_row.customer_ids)) THEN
      RAISE EXCEPTION 'Voucher unavailable' USING ERRCODE = 'P0001';
    END IF;
    IF voucher_row.usage_limit_total IS NOT NULL AND
       (SELECT count(*) FROM public.voucher_redemptions WHERE voucher_id = voucher_row.id)
         >= voucher_row.usage_limit_total THEN
      RAISE EXCEPTION 'Voucher total usage limit exceeded' USING ERRCODE = 'P0001';
    END IF;
    IF voucher_row.usage_limit_per_user IS NOT NULL AND
       (SELECT count(*) FROM public.voucher_redemptions
        WHERE voucher_id = voucher_row.id AND user_id = p_user_id)
         >= voucher_row.usage_limit_per_user THEN
      RAISE EXCEPTION 'Voucher per-user usage limit exceeded' USING ERRCODE = 'P0001';
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
        IF NOT FOUND THEN RAISE EXCEPTION 'Gift variant unavailable'; END IF;
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
        IF NOT FOUND THEN RAISE EXCEPTION 'Gift product unavailable'; END IF;
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
