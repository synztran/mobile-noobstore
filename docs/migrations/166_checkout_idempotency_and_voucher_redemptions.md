# Checkout idempotency and voucher redemptions

## Purpose

Make checkout retries idempotent and reserve voucher quotas atomically with order/stock creation. Give SQL failure paths stable codes that can safely be returned to customers without exposing internal diagnostics.

## Changes

- Adds `checkout_idempotency` and `voucher_redemptions` tables, indexes, RLS, and service-role-only grants.
- Updates `increment_voucher_used_count` and `submit_order`, and adds `get_checkout_idempotent_response` and `submit_order_with_checkout`.
- Expected SQL failures include a stable `CHECKOUT_*` code in the exception and `DETAIL`, including missing products/variants and insufficient stock.

## System behavior

- Checkout replays return the prior order for the same user/key and same request hash; key reuse with a different payload fails with `CHECKOUT_IDEMPOTENCY_CONFLICT`.
- Voucher quota checks, gift stock reservation, order creation, and redemption tracking commit atomically.
- Stock errors are `CHECKOUT_PRODUCT_NOT_FOUND`, `CHECKOUT_VARIANT_NOT_FOUND`, or `CHECKOUT_STOCK_UNAVAILABLE`.
- Checkout API responses expose `error_code` only. Internal meanings and remediation steps are available in the admin Checkout Error Codes page; raw SQL diagnostics remain in server logs.

## Existing data

- Existing primary-voucher order redemptions are backfilled into `voucher_redemptions` without incrementing historical counters.
- Tables are created idempotently and redemption backfill uses `ON CONFLICT DO NOTHING`.

## Deployment

- Apply this migration before deploying checkout code that invokes `submit_order_with_checkout`.
- No new environment variables or packages are required.
- Verify a normal checkout and an idempotent retry; do not retry a request when an order may already exist without checking its state first.
