-- ============================================================================
-- Migration 131: Lock down RLS policies and SECURITY DEFINER execute grants
-- ============================================================================
--
-- WHY: `apps/web` (storefront) and `apps/admin` share ONE Supabase project, so
-- every policy that targets `authenticated` also matches every customer
-- account, and `anon` is the public key shipped inside the browser bundle.
--
-- A full replay of migrations 001-130 (176 CREATE POLICY / 43 DROP POLICY) and
-- a consumer audit of both apps found four classes of hole:
--
--   1. OWNER SELF-WRITE ON THE GACHA ECONOMY.
--      127 dropped the 032-era policy *names* ("Users can update own event
--      tokens", "Users can insert own event tokens"), but the wider policies
--      added later by 035 ("Users manage own user_event_tokens",
--      "Users manage own user_mission_progress" — both FOR ALL, which also
--      permits INSERT and UPDATE) were never dropped. user_mission_progress
--      additionally still carries 032's own INSERT and UPDATE policies, and
--      profiles still carries 001's owner UPDATE plus 035's owner FOR ALL.
--      Net effect: any signed-in user could write their own token_count and
--      mission progress straight through PostgREST and mint unlimited gacha
--      tokens (which buy draws that pay out physical prizes).
--
--   2. POLICIES CREATED WITHOUT A `TO` CLAUSE.
--      A policy with no TO clause applies to PUBLIC, which includes `anon`.
--      Six of these sat on the points / gift-card economy, so anyone holding
--      the public anon key could mint gift cards with an arbitrary
--      points_value and point_transactions rows. Postgres ALSO grants EXECUTE
--      to PUBLIC on every new function, and no migration revoked table
--      privileges — so the explicit `GRANT ... TO service_role` lines were
--      never the real boundary.
--
--   3. THE WAREHOUSE SCHEMA (104).
--      Six policies named "warehouse: admin can write" actually granted
--      `FOR ALL TO authenticated USING (true) WITH CHECK (true)`. No policy in
--      this schema consults an admin role — no `is_admin()` helper exists
--      anywhere in the schema, so "admin" in a policy name is aspirational.
--
--   4. SECURITY DEFINER FUNCTIONS GRANTED TO anon / authenticated.
--      Including stock and order mutators (`submit_order`, callable by anon,
--      which writes an arbitrary `p_user_id` into orders.user_id), plus the
--      points RPCs (`earn_points`, `spend_points`) that take the caller's user
--      id as a parameter and never compare it to `auth.uid()`.
--
-- DELIBERATELY NOT CHANGED (verified safe, documented so nobody "fixes" them
-- the wrong way later):
--   * gacha_history — the spin inserts its own history with the authenticated
--     client (modules/gacha/server/draw.ts), so its own-row INSERT must stay.
--   * reward_claims / community_posts — their PUBLIC-scoped INSERT/ALL
--     policies use owner-scoped predicates (`auth.uid()::text = user_id`), so
--     anon cannot satisfy them.
--   * Public catalog reads (products, variants, categories, testimonials, …)
--     are intentional and untouched.
--
-- Every statement is idempotent: DROPs use IF EXISTS and the grant sweep
-- re-reads pg_proc, so this migration is safe to re-run.
--
-- ROLLBACK: this migration is intentionally not auto-reversible; restore the
-- previous policies from 001/032/035/056/076/090/104 if a rollback is needed.
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- A. The gacha economy: owners may READ, never WRITE, their own rows.
--    All token mutations (draw, refund, free grant) go through the admin
--    client; mission progress is advanced by process_mission_progress.
-- ────────────────────────────────────────────────────────────────────────────

-- user_event_tokens: 032 keeps "Users can view own event tokens" (SELECT), so
-- dropping the FOR ALL leaves reads working and removes INSERT/UPDATE/DELETE.
DROP POLICY IF EXISTS "Users manage own user_event_tokens" ON public.user_event_tokens;

-- user_mission_progress: drop all three write paths. 032's own-row SELECT
-- ("Users can view own mission progress") stays and covers the mission UI.
DROP POLICY IF EXISTS "Users manage own user_mission_progress" ON public.user_mission_progress;
DROP POLICY IF EXISTS "Users can upsert own mission progress" ON public.user_mission_progress;
DROP POLICY IF EXISTS "Users can update own mission progress" ON public.user_mission_progress;

-- ────────────────────────────────────────────────────────────────────────────
-- B. Economy policies that accidentally targeted PUBLIC (i.e. anon).
--    Recreated with the SAME names and predicates, scoped to service_role.
--    Authored-name policies are recreated verbatim except for the TO clause.
-- ────────────────────────────────────────────────────────────────────────────

-- point_rules: was FOR ALL USING (true) WITH CHECK (true) → writable by anon.
-- Admin UI reads/writes it through the service-role client
-- (apps/admin/src/app/api/points/rules/**).
DROP POLICY IF EXISTS "Service role manages point rules" ON public.point_rules;
CREATE POLICY "Service role manages point rules" ON public.point_rules
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- point_transactions: INSERT was PUBLIC WITH CHECK (true) → anon could mint
-- ledger rows. The own-row SELECT stays as authored.
DROP POLICY IF EXISTS "Service role inserts point transactions" ON public.point_transactions;
CREATE POLICY "Service role inserts point transactions" ON public.point_transactions
  FOR INSERT TO service_role
  WITH CHECK (true);

-- gift_cards: was FOR ALL USING (true) → anon could mint a card with any
-- points_value and then redeem it (redeem_gift_card credits the redeemer).
-- The own-card SELECT stays as authored.
DROP POLICY IF EXISTS "Service role manages gift cards" ON public.gift_cards;
CREATE POLICY "Service role manages gift cards" ON public.gift_cards
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role manages gift card redemptions" ON public.gift_card_redemptions;
CREATE POLICY "Service role manages gift card redemptions" ON public.gift_card_redemptions
  FOR INSERT TO service_role
  WITH CHECK (true);

-- gift_products: "Admins can manage gift_products" was FOR ALL USING (true)
-- with no TO clause. Public SELECT stays (storefront product pages read it).
DROP POLICY IF EXISTS "Admins can manage gift_products" ON public.gift_products;
CREATE POLICY "Admins can manage gift_products" ON public.gift_products
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- admin_audit_log: INSERT was PUBLIC WITH CHECK (true) → anonymous log spam.
-- The "Admins can read audit logs" SELECT stays; the audit writer uses the
-- admin client (apps/admin/src/lib/audit-log.ts).
DROP POLICY IF EXISTS "Service role can insert audit logs" ON public.admin_audit_log;
CREATE POLICY "Service role can insert audit logs" ON public.admin_audit_log
  FOR INSERT TO service_role
  WITH CHECK (true);

-- ────────────────────────────────────────────────────────────────────────────
-- C. Warehouse schema (104): "admin can write" granted EVERY authenticated
--    user full write on six tables. Nothing reads or writes these tables in
--    either app (only the generated database.types.ts mentions them), so they
--    are locked to service_role — which preserves the schema for the future
--    feature while removing the exposure. A future admin UI must either use
--    the service-role client or add a real is_admin() check; do not restore a
--    blanket `TO authenticated` policy.
-- ────────────────────────────────────────────────────────────────────────────

-- Written out explicitly (not via EXECUTE format in a loop) so the policy
-- lifecycle stays greppable and replayable by scripts/verify-rls.mjs.

-- suppliers
DROP POLICY IF EXISTS "warehouse: authenticated users can read" ON public.suppliers;
DROP POLICY IF EXISTS "warehouse: admin can write" ON public.suppliers;
CREATE POLICY "warehouse: service role access" ON public.suppliers
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- warehouse_receipts
DROP POLICY IF EXISTS "warehouse: authenticated users can read" ON public.warehouse_receipts;
DROP POLICY IF EXISTS "warehouse: admin can write" ON public.warehouse_receipts;
CREATE POLICY "warehouse: service role access" ON public.warehouse_receipts
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- warehouse_receipt_items
DROP POLICY IF EXISTS "warehouse: authenticated users can read" ON public.warehouse_receipt_items;
DROP POLICY IF EXISTS "warehouse: admin can write" ON public.warehouse_receipt_items;
CREATE POLICY "warehouse: service role access" ON public.warehouse_receipt_items
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- warehouse_exports
DROP POLICY IF EXISTS "warehouse: authenticated users can read" ON public.warehouse_exports;
DROP POLICY IF EXISTS "warehouse: admin can write" ON public.warehouse_exports;
CREATE POLICY "warehouse: service role access" ON public.warehouse_exports
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- warehouse_export_items
DROP POLICY IF EXISTS "warehouse: authenticated users can read" ON public.warehouse_export_items;
DROP POLICY IF EXISTS "warehouse: admin can write" ON public.warehouse_export_items;
CREATE POLICY "warehouse: service role access" ON public.warehouse_export_items
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- inventory_ledger
DROP POLICY IF EXISTS "warehouse: authenticated users can read" ON public.inventory_ledger;
DROP POLICY IF EXISTS "warehouse: admin can write" ON public.inventory_ledger;
CREATE POLICY "warehouse: service role access" ON public.inventory_ledger
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ────────────────────────────────────────────────────────────────────────────
-- D. profiles: no policy work is needed here.
--
--    Migration 059 already DROPPED public.profiles entirely (points moved to
--    public.users in 058), so any policy statement targeting public.profiles
--    here would throw `relation "public.profiles" does not exist` and abort the
--    whole migration — even on a clean replay of 001→131. profiles does not
--    exist at this point in the chain, so there is nothing to lock down.
--    (This section originally re-scoped 001/035's owner-write policies; 059
--    makes them moot.)
-- ────────────────────────────────────────────────────────────────────────────

-- ────────────────────────────────────────────────────────────────────────────
-- E. payment_information holds the store's bank account number and account
--    name. 018 granted it to `anon`; checkout is auth-gated and the only
--    reader is a server helper using the admin client
--    (src/lib/payment-information.ts), and 035's authenticated policy already
--    covers the intended audience. Narrowing anon → authenticated.
-- ────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS payment_information_select_public ON public.payment_information;
CREATE POLICY payment_information_select_public ON public.payment_information
  FOR SELECT TO authenticated
  USING (true);

-- ────────────────────────────────────────────────────────────────────────────
-- F. SECURITY DEFINER execute grants.
--
--    These functions mutate orders, stock, points and the gacha economy, and
--    they trust a caller-supplied `p_user_id`. Postgres grants EXECUTE to
--    PUBLIC on every new function, and no migration ever revoked it — so even
--    functions with only `GRANT ... TO service_role` were callable by anon.
--
--    Every call site was audited: all of them now reach these functions
--    through the service-role client (`admin.rpc`). Where a route previously
--    passed the user-session client it was switched to the admin client in the
--    same commit — the RPC is SECURITY DEFINER, so RLS was never what made
--    those calls safe; the caller check in the route is.
--
--    Revoking from PUBLIC, anon AND authenticated, then granting only
--    service_role, is therefore behavior-preserving. Iterating pg_proc keeps
--    this correct across overloads and future signature drift.
-- ────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  r record;
  locked text[] := ARRAY[
    'submit_order',               -- was callable by anon; writes p_user_id
    'submit_order_with_gifts',
    'submit_order_with_checkout',
    'get_checkout_idempotent_response',
    'validate_and_deduct_stock',  -- was callable by anon; mutates stock
    'get_kit_stock',
    'earn_points',                -- take p_user_id; no auth.uid() check
    'spend_points',               -- take p_user_id; no auth.uid() check
    'spend_checkin_points',       -- source-restricted check-in spend; takes p_user_id
    'redeem_daily_checkin_reward', -- transactionally spends source lots and issues voucher
    'adjust_points',
    'compute_points_for_amount',
    'redeem_gift_card',
    'get_point_rule',
    'get_user_order_stats',       -- takes p_user_id; leaks another user's spend
    'process_mission_progress',   -- take p_user_id; grant tokens
    'claim_mission_reward',       -- take p_user_id; credit tokens
    -- Found by scripts/verify-rls.mjs, not in the original audit: 105 defines
    -- this as SECURITY DEFINER but never REVOKEs the default PUBLIC grant, so
    -- anon could call it. No caller exists in either app.
    'reconcile_product_sold_count'
  ];
  count_locked int := 0;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig, p.proname
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = ANY (locked)
    ORDER BY p.proname, p.oid::regprocedure::text
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', r.sig);
    count_locked := count_locked + 1;
    RAISE NOTICE 'grant lockdown: % -> service_role only', r.sig;
  END LOOP;

  IF count_locked = 0 THEN
    RAISE EXCEPTION
      'Migration 131 found none of the expected functions in public — refusing to report success';
  END IF;

  RAISE NOTICE 'grant lockdown complete: % function signature(s) restricted', count_locked;
END $$;

-- ────────────────────────────────────────────────────────────────────────────
-- G. Self-check: report anything left that is still PUBLIC-scoped with an
--    always-true predicate and is not a read-only policy. Informational — the
--    CI guard (scripts/verify-rls.mjs) is what fails the build.
-- ────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  r record;
  remaining int := 0;
BEGIN
  FOR r IN
    SELECT tablename, policyname, cmd, roles::text AS roles, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
      AND 'public' = ANY (roles)
      AND cmd <> 'SELECT'
      AND (coalesce(qual, '') IN ('true', '(true)') OR coalesce(with_check, '') IN ('true', '(true)'))
  LOOP
    remaining := remaining + 1;
    RAISE NOTICE 'REVIEW: public.% policy "%" (%) is PUBLIC-scoped with an always-true predicate',
      r.tablename, r.policyname, r.cmd;
  END LOOP;

  IF remaining = 0 THEN
    RAISE NOTICE 'self-check: no PUBLIC-scoped always-true write policies remain in public';
  ELSE
    RAISE NOTICE 'self-check: % policy/ies need review (see above)', remaining;
  END IF;
END $$;
