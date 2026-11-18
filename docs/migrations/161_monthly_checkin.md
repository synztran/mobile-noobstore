# Migration 161: Monthly check-in

## Purpose

Adds database primitives and atomic RPCs for monthly daily check-in, expiring check-in points, holiday events, event voucher batches, and point-source-specific redemption.

## Changes

- Adds `checkin_settings` singleton, disabled by default, with weekday/weekend/holiday award values and fixed `Asia/Ho_Chi_Minh` timezone.
- Adds `checkin_events`, `checkin_records`, `checkin_point_lots`, `point_lot_spends`, `checkin_voucher_batches`, `checkin_voucher_batch_items`, `checkin_months`, and `checkin_month_voucher_items`.
- Adds `reward_items.points_currency` (`nsp` or `daily_checkin`), defaulting existing rows to `nsp`.
- Adds voucher source/event/batch references; existing vouchers default to `standard`.
- Adds service-role-only `claim_daily_checkin`, updates service-role-only `spend_points`, and adds `spend_checkin_points` and atomic `redeem_daily_checkin_reward`.
- Enables RLS and grants customer read access only to public settings/events and each user's own check-in/lot/spend rows. Privileged mutations require service role.

## System behavior

- `claim_daily_checkin` uses Vietnam-local current date, settings and configured event, prevents duplicate user/date claims, credits aggregate `users.points_balance` and immutable `point_transactions`, creates a monthly expiring point lot, and atomically assigns one unassigned event voucher when configured.
- Existing balances and all pre-migration point transactions remain unchanged and are treated as non-expiring points.
- Generic `spend_points` consumes expired check-in lots from aggregate balance, then earliest-expiring valid check-in points, then non-expiring points.
- `spend_checkin_points` can consume only unexpired daily-check-in lots.
- Feature defaults disabled until admin setup and explicit enablement.

## Existing data and destructive effects

- No existing balance backfill or data deletion. Existing `reward_items` receive `points_currency = 'nsp'`; existing vouchers receive `source_type = 'standard'`.
- Check-in data starts empty. Expiration timestamps are stored in `timestamptz`; expiry is end of local month converted from `Asia/Ho_Chi_Minh`.
- No rollback migration is supplied because reverting the spend RPC after point lots are issued could make expired points spendable. Safe rollback means disable check-in and keep ledger data; destructive drop is unsupported after launch.

## Deployment

1. Apply migration before deploying code that calls new RPCs.
2. Deploy application/admin code and companion migration documentation together.
3. Verify `yarn check:rls`; confirm functions are executable only by `service_role`.
4. Apply migration 162 to configure monthly cron. Configure Upstash rate limit (20 customer requests/minute/user); keep feature disabled until admin configuration and staging checks pass.
5. Test duplicate claim, point expiry, earliest-expiry spend, source-specific spend, event voucher assignment, and feature-disabled behavior in staging.

## Verification

- `yarn check:rls`
- `yarn type-check`
- Staging SQL/API tests for same-day concurrency, month boundary, legacy balance, and event voucher race.

## Rollback

Disable check-in and stop the cron schedule. Preserve schema and ledger rows. Destructive rollback is unsupported once any daily check-in points or event voucher batches have been issued.
