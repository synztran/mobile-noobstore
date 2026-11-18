-- Make NSP reward redemption atomic: voucher creation, point spend, stock and claim commit together.
CREATE OR REPLACE FUNCTION public.redeem_nsp_reward(
  p_user_id uuid,
  p_reward_item_id text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_reward public.reward_items%ROWTYPE;
  v_meta jsonb;
  v_new_balance bigint;
  v_spent_balance bigint;
  v_voucher_id text;
  v_voucher_code text;
  v_voucher_reward_type public.voucher_reward_type;
  v_point_amount integer;
  v_product_ref text;
  v_benefit text;
  v_phase text := 'validate';
BEGIN
  -- Stable error code and phase for unexpected failures; original SQL details remain in database logs.
  IF p_user_id IS NULL OR p_reward_item_id IS NULL OR btrim(p_reward_item_id) = '' THEN
    RAISE EXCEPTION 'invalid_redemption_request';
  END IF;

  SELECT * INTO v_reward
  FROM public.reward_items
  WHERE id = p_reward_item_id AND is_active AND points_currency = 'nsp'
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'reward_unavailable'; END IF;

  PERFORM 1 FROM public.users WHERE id = p_user_id::text FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'user_not_found'; END IF;
  IF v_reward.stock IS NOT NULL AND v_reward.claimed_count >= v_reward.stock THEN
    RAISE EXCEPTION 'reward_out_of_stock';
  END IF;

  v_meta := v_reward.metadata;
  IF v_reward.reward_type = 'voucher' THEN
    v_phase := 'create_voucher';
    v_voucher_reward_type := CASE
      WHEN v_meta->>'reward_type' = 'free_shipping' THEN 'shipping_percent_off'::public.voucher_reward_type
      WHEN v_meta->>'reward_type' = 'amount_off' AND v_meta->>'scope_type' = 'shipping_fee'
        THEN 'shipping_amount_off'::public.voucher_reward_type
      WHEN v_meta->>'reward_type' = 'percent_off' AND v_meta->>'scope_type' = 'shipping_fee'
        THEN 'shipping_percent_off'::public.voucher_reward_type
      ELSE coalesce(v_meta->>'reward_type', 'amount_off')::public.voucher_reward_type
    END;
    v_voucher_code := 'RE-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    INSERT INTO public.vouchers (
      code, name, description, status, reward_type, scope_type, amount_off,
      percent_off, max_discount_amount, min_order_amount, stackable,
      user_id, start_at, end_at, metadata
    ) VALUES (
      v_voucher_code,
      v_reward.name,
      v_reward.description,
      'active',
      v_voucher_reward_type,
      CASE WHEN v_voucher_reward_type IN ('shipping_percent_off', 'shipping_amount_off')
           THEN 'order_total'::public.voucher_scope_type
           ELSE coalesce(v_meta->>'scope_type', 'order_total')::public.voucher_scope_type END,
      CASE WHEN v_voucher_reward_type IN ('shipping_percent_off', 'shipping_amount_off')
           AND v_meta->>'reward_type' = 'free_shipping' THEN NULL::numeric
           ELSE nullif(v_meta->>'amount_off', '')::numeric END,
      CASE WHEN v_meta->>'reward_type' = 'free_shipping' THEN 100::numeric
           ELSE nullif(v_meta->>'percent_off', '')::numeric END,
      nullif(v_meta->>'max_discount_amount', '')::numeric,
      coalesce(nullif(v_meta->>'min_order_amount', '')::numeric, 0),
      coalesce((v_meta->>'stackable')::boolean, false),
      p_user_id::text,
      now(),
      now() + interval '90 days',
      '{}'::jsonb
    ) RETURNING id INTO v_voucher_id;
    v_benefit := CASE v_meta->>'reward_type'
      WHEN 'free_shipping' THEN 'Miễn phí vận chuyển'
      WHEN 'amount_off' THEN 'Giảm ' || to_char((v_meta->>'amount_off')::numeric, 'FM999,999,999,999') || '₫'
      WHEN 'percent_off' THEN 'Giảm ' || (v_meta->>'percent_off') || '%'
      ELSE '' END;
  ELSIF v_reward.reward_type = 'point' THEN
    v_point_amount := coalesce(nullif(v_meta->>'point_amount', '')::integer, 0);
    IF v_point_amount < 0 THEN RAISE EXCEPTION 'invalid_reward_metadata'; END IF;
    v_product_ref := NULL;
    v_benefit := 'Nhận ' || v_point_amount || ' điểm NSP';
  ELSE
    v_product_ref := nullif(v_meta->>'product_id', '');
    v_benefit := 'Đã đổi "' || v_reward.name || '"';
  END IF;

  SELECT new_balance INTO v_spent_balance
  FROM public.spend_points(
    p_user_id,
    v_reward.points_cost,
    CASE WHEN v_reward.reward_type = 'product' THEN 'product_exchange' ELSE 'voucher_exchange' END,
    p_reward_item_id,
    'Đổi "' || v_reward.name || '"'
  );
  v_new_balance := v_spent_balance;

  IF v_reward.reward_type = 'point' AND v_point_amount > 0 THEN
    v_new_balance := v_new_balance + v_point_amount;
    UPDATE public.users SET points_balance = v_new_balance WHERE id = p_user_id::text;
    INSERT INTO public.point_transactions(user_id, delta, balance_after, source_type, source_ref, note)
    VALUES (p_user_id, v_point_amount, v_new_balance, 'voucher_exchange', p_reward_item_id,
            'Đổi điểm: +' || v_point_amount || ' NSP từ "' || v_reward.name || '"');
  END IF;

  UPDATE public.reward_items
  SET claimed_count = claimed_count + 1, updated_at = now()
  WHERE id = p_reward_item_id;
  v_phase := 'record_claim';

  INSERT INTO public.reward_claims(
    user_id, reward_item_id, reward_type, points_spent, voucher_id,
    product_ref, point_amount, metadata
  ) VALUES (
    p_user_id::text, p_reward_item_id, v_reward.reward_type, v_reward.points_cost,
    v_voucher_id, v_product_ref, v_point_amount,
    CASE WHEN v_voucher_code IS NOT NULL THEN jsonb_build_object('voucher_code', v_voucher_code) ELSE '{}'::jsonb END
  );

  RETURN jsonb_build_object(
    'success', true,
    'rewardType', v_reward.reward_type,
    'voucherCode', v_voucher_code,
    'voucherName', CASE WHEN v_voucher_code IS NOT NULL THEN v_reward.name END,
    'pointAmount', v_point_amount,
    'productRef', v_product_ref,
    'pointsSpent', v_reward.points_cost,
    'newBalance', v_new_balance,
    'benefit', v_benefit
  );
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM IN (
      'invalid_redemption_request',
      'reward_unavailable',
      'user_not_found',
      'reward_out_of_stock',
      'insufficient_points',
      'invalid_reward_metadata'
    ) THEN
      RAISE;
    END IF;
    RAISE EXCEPTION 'reward_redemption_failed: phase=%', v_phase;
END;
$$;

-- REVOKE ALL keeps this SECURITY DEFINER RPC service-role-only (included in the lockdown grant audit).
REVOKE ALL ON FUNCTION public.redeem_nsp_reward(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_nsp_reward(uuid, text) TO service_role;
