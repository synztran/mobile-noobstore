# Migration 162: Monthly check-in voucher cron

## Purpose

Moves monthly check-in voucher pool generation into Supabase Postgres. The previous Next.js HTTP cron route is unnecessary for this database-only work and must not be scheduled.

## Changes

- Adds `public.prepare_monthly_checkin_vouchers(date DEFAULT NULL)`, a `SECURITY DEFINER` function with pinned `search_path = pg_catalog, public`.
- Function creates one `checkin_months` row and configured `checkin_month_voucher_items`/`vouchers` pool for the target month; unique month/item keys and transaction scope make reruns safe. Voucher code collisions are retried up to five times; other errors abort the transaction.
- Revokes function execution from `PUBLIC`, `anon`, and `authenticated`; grants only `service_role`.
- If `pg_cron` is enabled, schedules `monthly-checkin-voucher-pool` using `0 0 1 * *` (00:00 GMT on the first day, 07:00 Asia/Ho_Chi_Minh). Scheduling is idempotent by unscheduling the prior named job first.

## System behavior

- Function reads `checkin_settings.monthly_voucher_quantity` and `monthly_voucher_terms`.
- Generates unique, single-use voucher codes for the new local month, ending at next month’s 00:00 Vietnam time.
- `checkin_months.status = 'prepared'` prevents duplicate creation on manual rerun or schedule retry.
- Function is transactionally all-or-nothing: an error rolls back that invocation. Retry reruns the month safely. Each existing pool item is locked before work; `prepared` is written only after the configured number of items are created.
- Monthly vouchers are unassigned pool entries. `claim_daily_checkin` assigns one to a user atomically during eligible check-in.
- No customer balances or existing voucher records are changed.

## Deployment

1. Apply migration 161 first, then 162.
2. Enable Supabase `pg_cron` extension before applying 162 if automatic scheduling is desired. If absent, migration emits a warning and creates function only.
3. Configure `monthly_voucher_quantity` and valid `monthly_voucher_terms` in admin before the next month boundary. Keep feature disabled until staging verification passes.
4. Confirm `monthly-checkin-voucher-pool` exists in Supabase Cron and shows next run as 00:00 GMT on day 1 (07:00 Vietnam time).
5. For manual test, invoke `SELECT public.prepare_monthly_checkin_vouchers('YYYY-MM-01'::date);` using privileged SQL. Calling again should return `already_prepared = true` and create no duplicate rows.
6. Do not create an HTTP Request cron; monthly pool generation runs directly in Postgres.

## Verification

- Confirm function owner is privileged and execute grants only include `service_role`.
- Check cron history for successful execution and compare `checkin_months.voucher_count` with created monthly voucher items.
- Rerun the function for an already-prepared month and verify voucher count/codes do not change.
- Force invalid voucher terms in staging, confirm the transaction rolls back, correct terms, rerun, and verify successful preparation.

## Rollback

Disable/remove the named cron job and set check-in feature disabled. Keep issued voucher rows and month ledger. Dropping the function is safe only after cron is unscheduled; deleting generated/assigned vouchers is not supported.
