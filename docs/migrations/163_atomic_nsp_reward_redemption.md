# 163 — Atomic NSP reward redemption

## Purpose

Make redemption of NSP-funded rewards atomic. A failed voucher insert or claim write must not leave the customer's points deducted or reward stock incremented. Normalize legacy shipping reward scope (`shipping_fee`) into the supported voucher enum value (`order_total`) while preserving `free_shipping` reward behavior.

## Changes

- Adds `public.redeem_nsp_reward(uuid, text)`, a `SECURITY DEFINER` function that locks the user and reward rows, verifies availability/balance, creates an assigned voucher when needed, spends NSP, updates claimed count, records the claim, and returns the result in one transaction.
- Converts legacy `shipping_fee` metadata to the valid `order_total` voucher scope and matching shipping reward enum (`free_shipping` becomes `shipping_percent_off` at 100%; amount/percent discounts retain their values). This makes issued vouchers conform to the current enum and checks.
- Revokes function execution from `PUBLIC`, `anon`, and `authenticated`; grants it only to `service_role`.
- No table/schema data migration or backfill.

## System behavior

- `/api/rewards/redeem` delegates NSP reward redemption to the RPC. Any expected write error rolls back the voucher, point transaction/balance change, claim, and stock update together.
- Existing API auth remains required; the server supplies the authenticated user's ID to the service-role-only function.
- Daily-check-in currency redemption continues through the existing `redeem_daily_checkin_reward` flow.
- Customers retain their points and reward availability if redemption fails.

## Existing data

- Existing vouchers and reward rows are unchanged. Legacy shipping reward metadata is normalized at redemption time; source metadata is not rewritten.
- No destructive changes or backfill.

## Deployment

1. Apply this migration before deploying the updated web app.
2. No new environment variables or extensions are required.
3. Verify grants using `has_function_privilege` for authenticated and service_role.
4. Redeem a test free-shipping reward and confirm a user-owned active voucher and claim are created with points deducted once.
5. Force a transaction failure in a non-production test and confirm point balance and `claimed_count` remain unchanged.

## Rollback

Deploy the previous API implementation and drop `public.redeem_nsp_reward(uuid, text)`. The function does not rewrite existing rows; successful redemptions already completed remain valid and are not rolled back.
