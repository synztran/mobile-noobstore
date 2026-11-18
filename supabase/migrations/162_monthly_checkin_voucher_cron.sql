-- Generate the configured monthly check-in voucher pool directly in Postgres.
-- Supabase pg_cron uses GMT/UTC; 00:00 UTC on day 1 is 07:00 Vietnam time.

CREATE OR REPLACE FUNCTION public.prepare_monthly_checkin_vouchers(p_month_start date DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_month date := coalesce(
    p_month_start,
    date_trunc('month', now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
  );
  v_next_month date;
  v_quantity integer;
  v_terms jsonb;
  v_item_number integer;
  v_item_id uuid;
  v_existing_status text;
  v_voucher_id text;
  v_code text;
  v_created integer := 0;
  v_month_status text;
  v_failed_count integer;
  v_attempt integer;
BEGIN
  IF p_month_start IS NOT NULL AND p_month_start <> date_trunc('month', p_month_start::timestamp)::date THEN
    RAISE EXCEPTION 'p_month_start must be the first day of a month';
  END IF;
  v_next_month := (v_month + interval '1 month')::date;

  SELECT monthly_voucher_quantity, monthly_voucher_terms
    INTO v_quantity, v_terms
    FROM public.checkin_settings
    WHERE id = true
    FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'checkin_settings_missing'; END IF;

  INSERT INTO public.checkin_months(month_start, status, voucher_count, last_error)
    VALUES (v_month, 'processing', 0, NULL)
    ON CONFLICT (month_start) DO NOTHING;

  SELECT status INTO v_month_status
    FROM public.checkin_months
    WHERE month_start = v_month
    FOR UPDATE;
  IF v_month_status = 'prepared' THEN
    RETURN jsonb_build_object('month_start', v_month, 'already_prepared', true);
  END IF;
  UPDATE public.checkin_months
    SET status = 'processing', last_error = NULL
    WHERE month_start = v_month;

  IF v_quantity > 0 THEN
    FOR v_item_number IN 1..v_quantity LOOP
      INSERT INTO public.checkin_month_voucher_items(month_start, item_number, status)
        VALUES (v_month, v_item_number, 'pending')
        ON CONFLICT (month_start, item_number) DO NOTHING;
    END LOOP;

    FOR v_item_id, v_item_number, v_existing_status IN
      SELECT id, item_number, status
        FROM public.checkin_month_voucher_items
        WHERE month_start = v_month AND status IN ('pending', 'failed')
        ORDER BY item_number
        FOR UPDATE
    LOOP
      UPDATE public.checkin_month_voucher_items
        SET status = 'processing'
        WHERE id = v_item_id;

      v_voucher_id := NULL;
      FOR v_attempt IN 1..5 LOOP
        v_code := 'MO-' || to_char(v_month, 'YYYYMM') || '-' || lpad(v_item_number::text, 4, '0') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));
        INSERT INTO public.vouchers(
          code, name, description, status, source_type, reward_type, scope_type,
          amount_off, percent_off, max_discount_amount, min_order_amount,
          usage_limit_total, usage_limit_per_user, stackable, start_at, end_at,
          metadata
        ) VALUES (
          v_code,
          coalesce(nullif(v_terms->>'name', ''), 'Voucher điểm danh ' || to_char(v_month, 'MM/YYYY')),
          nullif(v_terms->>'description', ''),
          'active', 'event',
          coalesce(v_terms->>'reward_type', 'amount_off')::public.voucher_reward_type,
          coalesce(v_terms->>'scope_type', 'order_total')::public.voucher_scope_type,
          nullif(v_terms->>'amount_off', '')::numeric,
          nullif(v_terms->>'percent_off', '')::numeric,
          nullif(v_terms->>'max_discount_amount', '')::numeric,
          coalesce(nullif(v_terms->>'min_order_amount', '')::numeric, 0),
          1, 1, false,
          v_month::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh',
          v_next_month::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh',
          jsonb_build_object('checkin_month', v_month, 'item_number', v_item_number)
        ) ON CONFLICT DO NOTHING RETURNING id INTO v_voucher_id;
        EXIT WHEN v_voucher_id IS NOT NULL;
      END LOOP;
      IF v_voucher_id IS NULL THEN RAISE EXCEPTION 'could not generate unique voucher code for item %', v_item_number; END IF;

      UPDATE public.checkin_month_voucher_items
        SET voucher_id = v_voucher_id, status = 'created'
        WHERE id = v_item_id;
      v_created := v_created + 1;
    END LOOP;
  END IF;

  SELECT count(*) INTO v_failed_count
    FROM public.checkin_month_voucher_items
    WHERE month_start = v_month AND status IN ('pending', 'processing', 'failed');
  IF v_failed_count > 0 THEN
    RAISE EXCEPTION 'monthly voucher pool incomplete: % item(s) remain', v_failed_count;
  END IF;

  UPDATE public.checkin_months
    SET status = 'prepared', prepared_at = now(), voucher_count = v_quantity, last_error = NULL
    WHERE month_start = v_month;

  RETURN jsonb_build_object('month_start', v_month, 'already_prepared', false, 'created_count', v_created);
END;
$$;

REVOKE ALL ON FUNCTION public.prepare_monthly_checkin_vouchers(date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.prepare_monthly_checkin_vouchers(date) TO service_role;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'monthly-checkin-voucher-pool') THEN
      PERFORM cron.unschedule('monthly-checkin-voucher-pool');
    END IF;

    PERFORM cron.schedule(
      'monthly-checkin-voucher-pool',
      '0 0 1 * *',
      $cron$SELECT public.prepare_monthly_checkin_vouchers();$cron$
    );
  ELSE
    RAISE WARNING 'pg_cron is not enabled; schedule public.prepare_monthly_checkin_vouchers() manually.';
  END IF;
END;
$$;
