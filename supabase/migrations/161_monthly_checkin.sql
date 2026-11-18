-- Monthly check-in configuration, point lots, event voucher batches, and atomic RPCs.

CREATE TABLE public.checkin_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  enabled boolean NOT NULL DEFAULT false,
  weekday_points integer NOT NULL DEFAULT 1 CHECK (weekday_points >= 0),
  weekend_points integer NOT NULL DEFAULT 2 CHECK (weekend_points >= 0),
  holiday_weekday_points integer NOT NULL DEFAULT 1 CHECK (holiday_weekday_points >= 0),
  holiday_weekend_points integer NOT NULL DEFAULT 2 CHECK (holiday_weekend_points >= 0),
  monthly_voucher_quantity integer NOT NULL DEFAULT 0 CHECK (monthly_voucher_quantity >= 0 AND monthly_voucher_quantity <= 1000),
  monthly_voucher_terms jsonb NOT NULL DEFAULT '{}'::jsonb,
  timezone text NOT NULL DEFAULT 'Asia/Ho_Chi_Minh' CHECK (timezone = 'Asia/Ho_Chi_Minh'),
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.checkin_settings (id) VALUES (true) ON CONFLICT (id) DO NOTHING;

CREATE TABLE public.checkin_voucher_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  event_date date,
  month_start date,
  requested_count integer NOT NULL CHECK (requested_count > 0),
  created_count integer NOT NULL DEFAULT 0 CHECK (created_count >= 0),
  failed_count integer NOT NULL DEFAULT 0 CHECK (failed_count >= 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','partial','complete','failed')),
  terms jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by text REFERENCES public.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (event_date IS NOT NULL OR month_start IS NOT NULL)
);

CREATE TABLE public.checkin_voucher_batch_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES public.checkin_voucher_batches(id) ON DELETE CASCADE,
  item_number integer NOT NULL CHECK (item_number > 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','created','failed','assigned')),
  voucher_id text UNIQUE REFERENCES public.vouchers(id) ON DELETE SET NULL,
  assigned_user_id text REFERENCES public.users(id),
  error_message text,
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (batch_id, item_number),
  CHECK ((status = 'assigned') = (assigned_user_id IS NOT NULL)),
  CHECK (status NOT IN ('created','assigned') OR voucher_id IS NOT NULL)
);

CREATE TABLE public.checkin_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_date date NOT NULL,
  name text NOT NULL CHECK (btrim(name) <> ''),
  event_type text NOT NULL DEFAULT 'special' CHECK (event_type IN ('holiday','special')),
  weekday_points integer CHECK (weekday_points IS NULL OR weekday_points >= 0),
  weekend_points integer CHECK (weekend_points IS NULL OR weekend_points >= 0),
  voucher_batch_id uuid REFERENCES public.checkin_voucher_batches(id) ON DELETE SET NULL,
  voucher_quantity integer NOT NULL DEFAULT 0 CHECK (voucher_quantity >= 0 AND voucher_quantity <= 1000),
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_date)
);

CREATE TABLE public.checkin_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  local_date date NOT NULL,
  points_awarded integer NOT NULL CHECK (points_awarded >= 0),
  event_id uuid REFERENCES public.checkin_events(id) ON DELETE SET NULL,
  point_transaction_id bigint REFERENCES public.point_transactions(id),
  voucher_id text REFERENCES public.vouchers(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, local_date)
);

CREATE TABLE public.checkin_point_lots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  checkin_record_id uuid NOT NULL UNIQUE REFERENCES public.checkin_records(id) ON DELETE CASCADE,
  original_amount integer NOT NULL CHECK (original_amount > 0),
  remaining_amount integer NOT NULL CHECK (remaining_amount >= 0 AND remaining_amount <= original_amount),
  earned_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX checkin_point_lots_user_expiry_idx ON public.checkin_point_lots(user_id, expires_at) WHERE remaining_amount > 0;
CREATE INDEX checkin_records_user_date_idx ON public.checkin_records(user_id, local_date DESC);

CREATE TABLE public.point_lot_spends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  point_transaction_id bigint NOT NULL REFERENCES public.point_transactions(id),
  point_lot_id uuid REFERENCES public.checkin_point_lots(id),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount bigint NOT NULL CHECK (amount > 0),
  source text NOT NULL CHECK (source IN ('daily_checkin','non_expiring')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX point_lot_spends_tx_idx ON public.point_lot_spends(point_transaction_id);

CREATE TABLE public.checkin_months (
  month_start date PRIMARY KEY,
  prepared_at timestamptz NOT NULL DEFAULT now(),
  voucher_count integer NOT NULL DEFAULT 0 CHECK (voucher_count >= 0),
  status text NOT NULL DEFAULT 'prepared' CHECK (status IN ('prepared','processing','failed')),
  last_error text
);

CREATE TABLE public.checkin_month_voucher_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month_start date NOT NULL REFERENCES public.checkin_months(month_start) ON DELETE CASCADE,
  item_number integer NOT NULL CHECK (item_number > 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','created','assigned','failed')),
  voucher_id text UNIQUE REFERENCES public.vouchers(id) ON DELETE SET NULL,
  assigned_user_id text REFERENCES public.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (month_start, item_number),
  CHECK ((status = 'assigned') = (assigned_user_id IS NOT NULL)),
  CHECK (status NOT IN ('created','assigned') OR voucher_id IS NOT NULL)
);
ALTER TABLE public.checkin_month_voucher_items ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.checkin_month_voucher_items FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.checkin_month_voucher_items TO service_role;

ALTER TABLE public.reward_items
  ADD COLUMN points_currency text NOT NULL DEFAULT 'nsp'
    CHECK (points_currency IN ('nsp','daily_checkin'));
ALTER TABLE public.vouchers
  ADD COLUMN source_type text NOT NULL DEFAULT 'standard'
    CHECK (source_type IN ('standard','event')),
  ADD COLUMN checkin_event_id uuid REFERENCES public.checkin_events(id) ON DELETE SET NULL,
  ADD COLUMN checkin_batch_id uuid REFERENCES public.checkin_voucher_batches(id) ON DELETE SET NULL;
CREATE INDEX vouchers_checkin_batch_idx ON public.vouchers(checkin_batch_id) WHERE checkin_batch_id IS NOT NULL;

ALTER TABLE public.checkin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkin_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkin_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkin_point_lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.point_lot_spends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkin_voucher_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkin_voucher_batch_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkin_months ENABLE ROW LEVEL SECURITY;

CREATE POLICY checkin_settings_read ON public.checkin_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY checkin_events_read ON public.checkin_events FOR SELECT TO authenticated USING (enabled);
CREATE POLICY checkin_records_own_read ON public.checkin_records FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY checkin_lots_own_read ON public.checkin_point_lots FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY point_lot_spends_own_read ON public.point_lot_spends FOR SELECT TO authenticated USING (auth.uid() = user_id);

REVOKE ALL ON public.checkin_settings, public.checkin_events, public.checkin_records,
  public.checkin_point_lots, public.point_lot_spends,
  public.checkin_voucher_batches, public.checkin_voucher_batch_items, public.checkin_months FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.checkin_settings, public.checkin_events, public.checkin_records,
  public.checkin_point_lots, public.point_lot_spends TO authenticated;
GRANT ALL ON public.checkin_settings, public.checkin_events, public.checkin_records,
  public.checkin_point_lots, public.point_lot_spends,
  public.checkin_voucher_batches, public.checkin_voucher_batch_items, public.checkin_months TO service_role;

CREATE OR REPLACE FUNCTION public.claim_daily_checkin(p_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  v_now timestamptz := now();
  v_local_date date := (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date;
  v_weekday integer := extract(isodow FROM now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::integer;
  v_settings public.checkin_settings%ROWTYPE;
  v_event public.checkin_events%ROWTYPE;
  v_points integer;
  v_user_balance bigint;
  v_record_id uuid;
  v_lot_expiry timestamptz;
  v_tx_id bigint;
  v_voucher_id text;
  v_batch_item_id uuid;
  v_month_start date := date_trunc('month', v_now AT TIME ZONE 'Asia/Ho_Chi_Minh')::date;
BEGIN
  SELECT * INTO v_settings FROM public.checkin_settings WHERE id = true FOR SHARE;
  IF NOT FOUND OR NOT v_settings.enabled THEN RAISE EXCEPTION 'checkin_disabled'; END IF;
  PERFORM 1 FROM public.users WHERE id = p_user_id::text FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'user_not_found'; END IF;
  IF EXISTS (SELECT 1 FROM public.checkin_records WHERE user_id = p_user_id AND local_date = v_local_date) THEN
    RETURN jsonb_build_object('already_checked_in', true, 'local_date', v_local_date);
  END IF;
  IF v_weekday >= 6 THEN
    v_points := v_settings.weekend_points;
  ELSE
    v_points := v_settings.weekday_points;
  END IF;
  SELECT * INTO v_event FROM public.checkin_events WHERE event_date = v_local_date AND enabled FOR SHARE;
  IF FOUND THEN
    v_points := coalesce(CASE WHEN v_weekday >= 6 THEN v_event.weekend_points ELSE v_event.weekday_points END,
      CASE WHEN v_weekday >= 6 THEN v_settings.holiday_weekend_points ELSE v_settings.holiday_weekday_points END);
  ELSE
    v_points := CASE WHEN v_weekday >= 6 THEN v_settings.weekend_points ELSE v_settings.weekday_points END;
  END IF;
  v_lot_expiry := ((date_trunc('month', v_now AT TIME ZONE 'Asia/Ho_Chi_Minh') + interval '1 month')::date::timestamp
    AT TIME ZONE 'Asia/Ho_Chi_Minh') - interval '1 second';
  INSERT INTO public.checkin_records(user_id, local_date, points_awarded, event_id)
  VALUES (p_user_id, v_local_date, v_points, CASE WHEN v_event.id IS NULL THEN NULL ELSE v_event.id END)
  RETURNING id INTO v_record_id;
  IF v_points > 0 THEN
    UPDATE public.users SET points_balance = points_balance + v_points WHERE id = p_user_id::text RETURNING points_balance INTO v_user_balance;
    INSERT INTO public.point_transactions(user_id, delta, balance_after, source_type, source_ref, note)
    VALUES (p_user_id, v_points, v_user_balance, 'daily_checkin', v_record_id::text, 'Daily check-in ' || v_local_date)
    RETURNING id INTO v_tx_id;
    INSERT INTO public.checkin_point_lots(user_id, checkin_record_id, original_amount, remaining_amount, earned_at, expires_at)
    VALUES (p_user_id, v_record_id, v_points, v_points, v_now, v_lot_expiry);
    UPDATE public.checkin_records SET point_transaction_id = v_tx_id WHERE id = v_record_id;
  ELSE
    SELECT points_balance INTO v_user_balance FROM public.users WHERE id = p_user_id::text;
  END IF;
  IF v_event.voucher_batch_id IS NOT NULL THEN
    SELECT id, voucher_id INTO v_batch_item_id, v_voucher_id
    FROM public.checkin_voucher_batch_items
    WHERE batch_id = v_event.voucher_batch_id AND status = 'created' AND assigned_user_id IS NULL
    ORDER BY item_number FOR UPDATE SKIP LOCKED LIMIT 1;
    IF NOT FOUND THEN RAISE EXCEPTION 'checkin_event_voucher_exhausted'; END IF;
    UPDATE public.checkin_voucher_batch_items SET status = 'assigned', assigned_user_id = p_user_id::text, updated_at = now()
      WHERE id = v_batch_item_id;
    UPDATE public.vouchers SET user_id = p_user_id::text, source_type = 'event', checkin_event_id = v_event.id,
      checkin_batch_id = v_event.voucher_batch_id WHERE id = v_voucher_id AND user_id IS NULL;
    IF NOT FOUND THEN RAISE EXCEPTION 'checkin_event_voucher_assignment_failed'; END IF;
    UPDATE public.checkin_records SET voucher_id = v_voucher_id, event_id = v_event.id WHERE id = v_record_id;
  ELSE
    SELECT id, voucher_id INTO v_batch_item_id, v_voucher_id FROM public.checkin_month_voucher_items
      WHERE month_start = v_month_start AND status = 'created' ORDER BY item_number FOR UPDATE SKIP LOCKED LIMIT 1;
    IF FOUND THEN
      UPDATE public.checkin_month_voucher_items SET status = 'assigned', assigned_user_id = p_user_id::text WHERE id = v_batch_item_id;
      UPDATE public.vouchers SET user_id = p_user_id::text WHERE id = v_voucher_id AND user_id IS NULL;
      IF NOT FOUND THEN RAISE EXCEPTION 'checkin_month_voucher_assignment_failed'; END IF;
      UPDATE public.checkin_records SET voucher_id = v_voucher_id WHERE id = v_record_id;
    END IF;
  END IF;
  RETURN jsonb_build_object('already_checked_in', false, 'local_date', v_local_date, 'points_awarded', v_points,
    'balance', v_user_balance, 'expires_at', CASE WHEN v_points > 0 THEN v_lot_expiry ELSE NULL END, 'voucher_id', v_voucher_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.spend_points(
  p_user_id uuid, p_amount bigint, p_source_type text, p_source_ref text DEFAULT NULL, p_note text DEFAULT NULL
) RETURNS TABLE(transaction_id bigint, new_balance bigint)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  v_balance bigint;
  v_new_balance bigint;
  v_tx_id bigint;
  v_expired bigint;
  v_take bigint;
  v_remaining bigint;
  v_lot record;
BEGIN
  IF p_amount <= 0 THEN RAISE EXCEPTION 'spend_points: p_amount must be > 0'; END IF;
  SELECT points_balance INTO v_balance FROM public.users WHERE id = p_user_id::text FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'spend_points: user not found'; END IF;
  SELECT coalesce(sum(remaining_amount),0) INTO v_expired FROM (
    SELECT remaining_amount FROM public.checkin_point_lots
    WHERE user_id = p_user_id AND expires_at <= now() AND remaining_amount > 0 FOR UPDATE
  ) expired_lots;
  IF v_expired > 0 THEN
    UPDATE public.checkin_point_lots SET remaining_amount = 0
    WHERE user_id = p_user_id AND expires_at <= now() AND remaining_amount > 0;
    v_balance := v_balance - v_expired;
    UPDATE public.users SET points_balance = v_balance WHERE id = p_user_id::text;
    INSERT INTO public.point_transactions(user_id, delta, balance_after, source_type, source_ref, note)
    VALUES (p_user_id, -v_expired, v_balance, 'daily_checkin_expiry', NULL, 'Expired check-in points');
  END IF;
  IF v_balance < p_amount THEN RAISE EXCEPTION 'spend_points: insufficient balance'; END IF;
  v_new_balance := v_balance - p_amount;
  UPDATE public.users SET points_balance = v_new_balance WHERE id = p_user_id::text;
  INSERT INTO public.point_transactions(user_id, delta, balance_after, source_type, source_ref, note)
  VALUES (p_user_id, -p_amount, v_new_balance, p_source_type, p_source_ref, p_note) RETURNING id INTO v_tx_id;
  v_remaining := p_amount;
  FOR v_lot IN SELECT id, remaining_amount FROM public.checkin_point_lots
    WHERE user_id = p_user_id AND expires_at > now() AND remaining_amount > 0
    ORDER BY expires_at, earned_at, id FOR UPDATE
  LOOP
    EXIT WHEN v_remaining = 0;
    v_take := least(v_lot.remaining_amount::bigint, v_remaining);
    UPDATE public.checkin_point_lots SET remaining_amount = remaining_amount - v_take WHERE id = v_lot.id;
    INSERT INTO public.point_lot_spends(point_transaction_id, point_lot_id, user_id, amount, source)
    VALUES (v_tx_id, v_lot.id, p_user_id, v_take, 'daily_checkin');
    v_remaining := v_remaining - v_take;
  END LOOP;
  IF v_remaining > 0 THEN
    INSERT INTO public.point_lot_spends(point_transaction_id, point_lot_id, user_id, amount, source)
    VALUES (v_tx_id, NULL, p_user_id, v_remaining, 'non_expiring');
  END IF;
  transaction_id := v_tx_id; new_balance := v_new_balance; RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.spend_checkin_points(
  p_user_id uuid, p_amount bigint, p_source_ref text DEFAULT NULL, p_note text DEFAULT NULL
) RETURNS TABLE(transaction_id bigint, new_balance bigint)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  v_balance bigint;
  v_new_balance bigint;
  v_tx_id bigint;
  v_available bigint;
  v_expired bigint;
  v_take bigint;
  v_remaining bigint;
  v_lot record;
BEGIN
  IF p_amount <= 0 THEN RAISE EXCEPTION 'spend_checkin_points: p_amount must be > 0'; END IF;
  SELECT points_balance INTO v_balance FROM public.users WHERE id = p_user_id::text FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'spend_checkin_points: user not found'; END IF;
  SELECT coalesce(sum(remaining_amount),0) INTO v_expired FROM (
    SELECT remaining_amount FROM public.checkin_point_lots
    WHERE user_id = p_user_id AND expires_at <= now() AND remaining_amount > 0 FOR UPDATE
  ) expired_lots;
  IF v_expired > 0 THEN
    UPDATE public.checkin_point_lots SET remaining_amount = 0
      WHERE user_id = p_user_id AND expires_at <= now() AND remaining_amount > 0;
    v_balance := v_balance - v_expired;
    UPDATE public.users SET points_balance = v_balance WHERE id = p_user_id::text;
    INSERT INTO public.point_transactions(user_id, delta, balance_after, source_type, source_ref, note)
      VALUES (p_user_id, -v_expired, v_balance, 'daily_checkin_expiry', NULL, 'Expired check-in points');
  END IF;
  SELECT coalesce(sum(remaining_amount),0) INTO v_available FROM public.checkin_point_lots
    WHERE user_id = p_user_id AND expires_at > now() AND remaining_amount > 0;
  IF v_available < p_amount THEN RAISE EXCEPTION 'spend_checkin_points: insufficient balance'; END IF;
  v_new_balance := v_balance - p_amount;
  UPDATE public.users SET points_balance = v_new_balance WHERE id = p_user_id::text;
  INSERT INTO public.point_transactions(user_id, delta, balance_after, source_type, source_ref, note)
    VALUES (p_user_id, -p_amount, v_new_balance, 'daily_checkin_exchange', p_source_ref, p_note) RETURNING id INTO v_tx_id;
  v_remaining := p_amount;
  FOR v_lot IN SELECT id, remaining_amount FROM public.checkin_point_lots
    WHERE user_id = p_user_id AND expires_at > now() AND remaining_amount > 0
    ORDER BY expires_at, earned_at, id FOR UPDATE
  LOOP
    EXIT WHEN v_remaining = 0;
    v_take := least(v_lot.remaining_amount::bigint, v_remaining);
    UPDATE public.checkin_point_lots SET remaining_amount = remaining_amount - v_take WHERE id = v_lot.id;
    INSERT INTO public.point_lot_spends(point_transaction_id, point_lot_id, user_id, amount, source)
      VALUES (v_tx_id, v_lot.id, p_user_id, v_take, 'daily_checkin');
    v_remaining := v_remaining - v_take;
  END LOOP;
  transaction_id := v_tx_id; new_balance := v_new_balance; RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.redeem_daily_checkin_reward(p_user_id uuid, p_reward_item_id text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  v_reward public.reward_items%ROWTYPE;
  v_balance bigint;
  v_available bigint;
  v_new_balance bigint;
  v_tx_id bigint;
  v_voucher_id text;
  v_code text;
  v_remaining bigint;
  v_take bigint;
  v_lot record;
  v_meta jsonb;
BEGIN
  PERFORM 1 FROM public.users WHERE id = p_user_id::text FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'user_not_found'; END IF;
  SELECT * INTO v_reward FROM public.reward_items
    WHERE id = p_reward_item_id AND is_active AND points_currency = 'daily_checkin' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'reward_unavailable'; END IF;
  IF v_reward.stock IS NOT NULL AND v_reward.claimed_count >= v_reward.stock THEN RAISE EXCEPTION 'reward_out_of_stock'; END IF;
  SELECT points_balance INTO v_balance FROM public.users WHERE id = p_user_id::text;
  SELECT coalesce(sum(remaining_amount),0) INTO v_available FROM public.checkin_point_lots
    WHERE user_id = p_user_id AND expires_at > now() AND remaining_amount > 0;
  IF v_available < v_reward.points_cost THEN RAISE EXCEPTION 'insufficient_checkin_points'; END IF;
  v_new_balance := v_balance - v_reward.points_cost;
  UPDATE public.users SET points_balance = v_new_balance WHERE id = p_user_id::text;
  INSERT INTO public.point_transactions(user_id, delta, balance_after, source_type, source_ref, note)
    VALUES (p_user_id, -v_reward.points_cost, v_new_balance, 'daily_checkin_exchange', p_reward_item_id, 'Daily check-in reward: ' || v_reward.name)
    RETURNING id INTO v_tx_id;
  v_remaining := v_reward.points_cost;
  FOR v_lot IN SELECT id, remaining_amount FROM public.checkin_point_lots
    WHERE user_id = p_user_id AND expires_at > now() AND remaining_amount > 0
    ORDER BY expires_at, earned_at, id FOR UPDATE
  LOOP
    EXIT WHEN v_remaining = 0;
    v_take := least(v_lot.remaining_amount::bigint, v_remaining);
    UPDATE public.checkin_point_lots SET remaining_amount = remaining_amount - v_take WHERE id = v_lot.id;
    INSERT INTO public.point_lot_spends(point_transaction_id, point_lot_id, user_id, amount, source)
      VALUES (v_tx_id, v_lot.id, p_user_id, v_take, 'daily_checkin');
    v_remaining := v_remaining - v_take;
  END LOOP;
  UPDATE public.reward_items SET claimed_count = claimed_count + 1, updated_at = now() WHERE id = p_reward_item_id;
  v_meta := v_reward.metadata;
  IF v_reward.reward_type = 'voucher' THEN
    v_code := 'DC-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
    INSERT INTO public.vouchers(code, name, description, status, source_type, reward_type, scope_type, amount_off,
      percent_off, max_discount_amount, min_order_amount, stackable, user_id, start_at, end_at, metadata)
    VALUES (v_code, v_reward.name, v_reward.description, 'active', 'standard',
      coalesce(v_meta->>'reward_type', 'amount_off')::public.voucher_reward_type,
      coalesce(v_meta->>'scope_type', 'order_total')::public.voucher_scope_type,
      nullif(v_meta->>'amount_off','')::numeric, nullif(v_meta->>'percent_off','')::numeric,
      nullif(v_meta->>'max_discount_amount','')::numeric, coalesce(nullif(v_meta->>'min_order_amount','')::numeric,0),
      false, p_user_id::text, now(), now() + interval '90 days', '{}'::jsonb)
    RETURNING id INTO v_voucher_id;
  END IF;
  INSERT INTO public.reward_claims(user_id,reward_item_id,reward_type,points_spent,voucher_id,point_amount,metadata)
  VALUES (p_user_id::text,p_reward_item_id,v_reward.reward_type,v_reward.points_cost,v_voucher_id,
    CASE WHEN v_reward.reward_type = 'point' THEN nullif(v_meta->>'point_amount','')::integer ELSE NULL END,
    jsonb_build_object('points_currency','daily_checkin'));
  RETURN jsonb_build_object('voucher_id',v_voucher_id,'voucher_code',v_code,'points_spent',v_reward.points_cost,
    'new_balance',v_new_balance,'reward_name',v_reward.name,'reward_type',v_reward.reward_type);
END;
$$;

REVOKE ALL ON FUNCTION public.claim_daily_checkin(uuid), public.spend_checkin_points(uuid,bigint,text,text),
  public.redeem_daily_checkin_reward(uuid,text), public.spend_points(uuid,bigint,text,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_daily_checkin(uuid), public.spend_checkin_points(uuid,bigint,text,text),
  public.redeem_daily_checkin_reward(uuid,text), public.spend_points(uuid,bigint,text,text,text) TO service_role;
