# Security audit — web storefront (claude-red)

Date: 2026-11-06
Scope: `apps/web` (Next.js 15 + Supabase), public/low-privilege attacker, static
code review only. No deployed target or live network tested.

Method: read focused `claude-red` API security, IDOR, business-logic, and
race-condition checklists, then traced affected handlers, server modules, and
relevant migrations.

## Findings

| #   | Severity                       | Location                                                                              | Finding                                                                                         |
| --- | ------------------------------ | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| 1   | High — fixed in working tree   | `apps/web/src/app/api/gacha/mission/progress/route.ts:31-56`                          | Client could fabricate order-count/spend mission progress                                       |
| 2   | Medium — fixed in working tree | `apps/web/src/app/api/checkout/submit/route.ts:99-109,438-448,829-853`                | Checkout trusted client gift snapshots; now DB-derived and atomically reserved by migration 164 |
| 3   | Medium — fixed in working tree | `scripts/verify-rls.mjs:126-188,294-305`                                              | `check:rls` falsely reported 5 RLS-enabled warehouse tables                                     |
| 5   | Low — fixed in working tree    | `apps/web/src/app/api/community/posts/[id]/route.ts:15-25`                            | Concurrent post reads lost view-count increments                                                |

### 1. Client-forgeable gacha mission progress — High — fixed

`POST /api/gacha/mission/progress` authenticates a user, but accepts
`event_id`, `mission_type`, and arbitrary `context` from the request without
restricting mission types (`route.ts:31-56`). It passes the values and verified
user ID to `process_mission_progress` with the service-role client. Migration
131 revokes direct client execution of this SECURITY DEFINER RPC, but this
public route acts as a privileged proxy.

The SQL trusts the proxy context: order-based missions check only whether the
caller-provided `order_status` matches the requirement; `spend_amount` adds
caller-provided `context.amount` (`062_mission_order_status_filter.sql:45-67,
84-98`); `order_count` increments once per call (`:100-112`). The browser type
includes all mission types (`modules/gacha/types.ts:101-105`). An authenticated
attacker can repeatedly POST their active event with `mission_type:
"order_count"` and matching `context.order_status`, or a large amount for a
spend mission, then call the claim endpoint. No qualifying order is required.

**Impact before fix:** unauthorized gacha tokens, spendable on draws/rewards.

**Fix applied:** the client route allows only `login_count`, discards client
context, and has a regression test. Order/spend/play progress remains limited
to trusted server flows.

### 2. Forged free gift items at checkout — Medium — fixed

The checkout request accepts `vouchers[].gift_items_snapshot`
(`checkout/submit/route.ts:99-109`). Checkout re-fetches voucher rows and
revalidates discount eligibility but does not rebuild the gift snapshot from
those rows (`:438-448`). After order creation it takes the submitted snapshot,
looks up only product names/thumbnails, then inserts each row at
`unit_price: 0` (`:951-981`). Gift rows are not included in the inventory
decrement RPC's `p_items`.

Attack: authenticate and submit a normal paid, in-stock product plus a forged
voucher snapshot naming any known product ID with positive quantity. The paid
line creates the order; the forged gift is attached for free, without validating
that a valid gift-item voucher exists or reserving stock.

**Impact:** unauthorized free goods in order records, fulfillment loss and
inventory drift.

**Fix applied:** discard client snapshots, derive gifts from validated voucher
rows, and call service-role-only `submit_order_with_gifts`. Migration 164 checks
and reserves gift stock and inserts the zero-price item in one transaction. The
ordinary six-argument checkout RPC remains unchanged. Apply migration 164 before
deploying the web route.

### 3. RLS guard false positives — Medium (guard reliability) — fixed

`yarn check:rls` currently fails on five warehouse tables. Migration
`153_warehouse_catalog.sql:131-148` does enable RLS and creates admin-only
policies for all five, but through a `DO` loop and `EXECUTE format(...)`. The
guard strips dollar-quoted bodies and only recognizes literal `ALTER TABLE …
ENABLE ROW LEVEL SECURITY` (`verify-rls.mjs:126-163`).

**Impact:** not a data exposure—the migration does enable RLS. But the security
guard is permanently red, making real regressions indistinguishable from noise.
Confirmed locally: exactly these five tables fail; `yarn check:admin-auth`
passes.

**Fix applied:** guard recognizes this restricted `DO`/`FOREACH` literal array;
`yarn check:rls` now passes.

The former `/apiAdmin/products` route was unused after product authoring moved
to the separate admin app. It has been removed from the storefront patch rather
than relocated.

### 5. Community view-count lost update — Low — fixed

Public post GET reads `view_count`, computes `n + 1`, and writes the absolute
value (`api/community/posts/[id]/route.ts:15-31`). Concurrent requests can both
write the same `n+1`; repeated refreshes also inflate counts. Published-only
post filtering is correctly enforced (`lib/community-server.ts:376-383`).

**Impact:** analytics drift only; no authorization or money impact.

**Fix applied:** migration 164 adds atomic `increment_community_post_view_count`
for published posts, callable only through service role. Repeated refreshes
still count separately; deduplication is out of scope.

## Surfaces checked and found sound

- **API authorization:** sensitive customer handlers use verified Supabase
  users; reviewed non-user endpoints use narrow public reads or fail-closed
  secret/signature checks. `scripts/verify-admin-auth.mjs` passes for admin.
- **Order IDOR:** cancel, return, pickup-code scope reads by order ID and
  `user_id`; payment details owner-scope both order number and UUID
  (`modules/payments/server/details.ts:18-25`).
- **Payment QR:** owner-scoped lookup, per-IP limiter, bank allowlist, private
  no-store response and restrictive CSP
  (`api/orders/[id]/payment/qr/route.ts:11-31`).
- **Checkout pricing:** server loads base prices, variant adjustments, and
  compatibility rules; client prices do not reach `submit_order`
  (`checkout/submit/route.ts:230-275,340-391`). Discounts are revalidated and
  capped (`:434-657`).
- **Payment state:** migration 158 blocks customer-role updates to financial
  fields and paid-state transitions without verified receipts
  (`158_verified_order_payments.sql:55-82`).
- **Gift-card redemption:** checks ownership; DB RPC remains final authority.
  Generated codes are 16 characters and API requests are throttled.
- **Open redirect:** `safeRedirect()` parses against known origin and rejects
  cross-origin destinations (`modules/user/redirect.ts:6-30`).
- **Community disclosure:** detail helper filters `status = 'published'`.
- **CI/CD:** PR #5 merged; CI/Vercel checks green. Vercel reports
  `Canceled by Ignored Build Step`, confirming Git-triggered production deploy
  is skipped. GitHub `production` environment has no reviewers or secrets; API
  refused reviewer setup (HTTP 422, plan does not support the protection rule).
  Therefore approval gate is not active, and deploy workflow also needs three
  Vercel secrets before it can run.
- **RLS replay coverage:** this repository's `prd` branch tracks only migrations
  001–021, while later SQL (including lockdown 131 and the applied migration
  164) is maintained outside Git. CI skips replay with a warning unless at
  least 100 migrations are present. `yarn check:rls` passing against the full
  local history is not evidence that CI verified those external migrations.

## Not audited

- Live auth/PWA behavior, external payment callbacks, deployed production
  configuration.
- Every RLS policy and SECURITY DEFINER function individually; `check:rls`'
  five warehouse findings are parser false positives above.
- Admin/warehouse code and tests requiring live network or deployment secrets.
