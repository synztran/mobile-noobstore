# Migration 158 — Verified order payments

**SQL:** [`158_verified_order_payments.sql`](../../supabase/migrations/158_verified_order_payments.sql)
**Related runbook:** [Manual payment verification](../runbooks/manual-payment-verification.md)

## Purpose

Make recorded receipts—not customer screenshots, browser state, or manual status
changes—the source of payment evidence. Keep verification manual: staff must
check actual incoming funds in the store's banking app, cash records, or COD
settlement records. This migration does not integrate a bank/provider webhook or
independently prove that funds arrived.

## Benefits to our system

- **Lower payment-fraud risk:** status clicks and customer screenshots cannot
  substitute for recorded receipts. Staff must attest to money actually received.
- **Fewer unpaid fulfillment mistakes:** dispatch requires covered payment or a
  deposit, and transitioning to completed delivery requires full coverage.
- **No double-crediting the same transaction:** unique references prevent a bank
  transaction from being reused across orders for the same receiving account.
- **Flexible payment collection:** one order can receive several partial bank
  transfers, cash receipts, or COD settlements before reaching its payment target.
- **Clear accountability:** receipt records identify the verifying admin, amounts,
  timestamps, and notes; payment recording also creates an admin audit event.
- **Corrections without losing evidence:** reversal entries preserve original
  receipts and keep their transaction references reserved against reuse.
- **Stronger receiving-account protection:** client roles cannot edit bank
  configuration, and configuration changes retain old/new audit snapshots.
- **Continuity for existing orders:** labeled legacy opening balances preserve
  historical payment coverage without inventing bank verification evidence.
- **Consistent enforcement across application paths:** database guards apply to
  order writes from single-order, bulk, pickup, and service-role paths—not only UI
  buttons.

These controls reduce fraud and staff mistakes; they do not independently prove
funds arrived. Staff must still verify the store's own bank/cash/COD records.
QR generation and the deployment recipient allowlist are companion application
protections, not benefits installed by this SQL migration alone.

## Database changes

### `public.order_payment_receipts`

New receipt ledger linked to `orders`:

| Field | Purpose |
|---|---|
| `id`, `order_id` | UUID receipt identity and **text** owning-order key matching `orders.id` |
| `amount` | Positive receipt or negative reversal, in whole VND |
| `method` | `bank`, `cash`, `cod`, `legacy`, or `reversal` |
| `receiving_account` | Snapshot of configured bank identity for bank receipts |
| `transaction_reference` | Bank transaction, cash receipt, or COD settlement reference |
| `received_at` | Staff-entered time funds were received |
| `verified_at`, `verified_by` | Recording timestamp and acting admin's auth identity |
| `note` | Internal note, up to 1,000 characters |
| `reversal_of` | Original receipt corrected by a negative entry |

Constraints and indexes:

- Amount must be nonzero and within JavaScript's safe-integer range.
- Only reversals may be negative; every reversal references one original receipt.
- Each original receipt can be reversed only once.
- Bank references are unique per receiving-account snapshot, across all orders.
- Cash/COD references are unique per method, across all orders.
- Reversing a receipt does not release its original reference for reuse.
- An `order_id` index supports order receipt lookups.

RLS is enabled. `anon`, `authenticated`, and `service_role` lose direct table
privileges; only `SELECT` is restored to `service_role`. Receipt mutations go
through the privileged RPC, not direct API table writes. Database owners retain
their administrative powers; this is not protection against a database-owner
compromise.

### `public.record_verified_order_payment(...)`

New `SECURITY DEFINER` RPC with fixed `search_path = public`:

`p_order_id` is **text**, matching the existing `orders.id` schema. `p_admin_id`
and `p_reversal_of` remain UUIDs, matching `auth.users.id` and receipt IDs.
The RPC execution grants use this same text-first function signature.

1. Requires a service-role request and a supplied admin identity whose
   `public.users.role` is `admin`. The API must derive that identity from its
   authenticated session; the RPC does not authenticate a human by itself.
2. Locks the order with `FOR UPDATE`, serializing receipt recording for that order.
3. Rejects missing orders and orders in `cancelled`, `refunded`, or `returning`.
   This restriction also applies to reversals.
4. Validates amount, method, receipt timestamp, reference, and note. Receipt time
   cannot be more than five minutes in the future.
5. For a bank receipt, resolves the supplied bank configuration **ID** through
   `payment_information`; it does not accept an arbitrary recipient account.
   Bank references must match the uppercase reference format defined in SQL.
6. For a reversal, derives the negative amount from the original positive receipt
   on the same order and requires a correction reason of at least 10 characters.
7. Inserts the receipt, sums the ledger, updates eligible order statuses, and
   inserts an `order.verify_payment` entry into `admin_audit_log` atomically.
8. Returns receipt ID, collected amount, overpayment, previous status, and status.

Execution is revoked from `PUBLIC`, `anon`, and `authenticated`, and granted only
to `service_role`. Duplicate-reference or audit-write failures roll back the RPC
transaction rather than leaving a partly recorded payment.

### `public.guard_verified_order_payment()` and `orders_guard_verified_payment`

New `BEFORE INSERT OR UPDATE` trigger on `orders`, including writes made through
service-role APIs and existing RPCs:

- Rejects inserts with payment timestamps or an already paid/dispatched/delivered
  status.
- Rejects direct customer-role changes to status, payment timestamps, total,
  deposit, remaining amount, or payment type.
- Recomputes `paid_at` and `deposit_paid_at` from the receipt balance on updates.
  Existing timestamps are retained while the relevant threshold remains covered;
  otherwise they are cleared. A newly reached threshold uses the latest ledger
  verification timestamp.
- Checks payment requirements when status changes:

| Target status | Required evidence |
|---|---|
| `confirmed` | Full amount covered; not a deposit order |
| `first_paid` | Deposit order with deposit threshold covered |
| `second_paid` | Deposit order with full amount covered |
| `delivering` | Full payment or deposit covered |
| `delivered` | Full amount covered |

The receipt RPC derives statuses for orders currently in `pending`, `confirmed`,
`first_paid`, or `second_paid`: insufficient receipts → `pending`; covered deposit
→ `first_paid`; full coverage → `confirmed` or `second_paid`. It can move directly
to full coverage if one transfer covers the whole order.

**Important behavior:** a reversal or total/fee increase can clear payment
timestamps without changing a fulfillment status such as `delivering` or
`delivered`. Status validation runs on a status transition, not every update.
The migration does not implement a complete order-status transition graph and
does not recalculate `remaining_amount` from receipts. Consumers should use the
ledger-derived balance for the actual unpaid amount.

### Bank configuration restrictions and audit

- Revokes `INSERT`, `UPDATE`, and `DELETE` on `payment_information` from `anon`
  and `authenticated`; existing read access is unchanged.
- Creates `payment_configuration_audit` with actor ID, actor role, timestamp,
  operation, and old/new row snapshots.
- Adds `audit_payment_configuration()` and the `payment_information_audit`
  `AFTER INSERT OR UPDATE OR DELETE` trigger.
- Enables RLS on the audit table, revokes direct access from client/service roles,
  and grants only `SELECT` to `service_role`.
- Revokes direct public/client execution of both trigger functions.

Audit insertion occurs in the configuration-write transaction. Failed auditing
prevents that configuration change. Service-role changes may identify only the
service role, not a named human; operational edits still need an operator ticket.
No separate receipt RLS policies are added; access is restricted through RLS,
explicit grants, and the RPC boundary.

## Existing data and compatibility

Before installing the order trigger, the migration backfills one `legacy`
opening-balance receipt for each qualifying order:

- `paid_at` present: use current `total_price`.
- Otherwise, `deposit_paid_at` present: use current `deposit_amount`.
- Only positive amounts qualify.
- `received_at` uses the existing payment timestamp.
- No bank reference, receiving account, or verifying admin is invented.
- The note explicitly states that this is not independently bank-verified.

Backfill includes qualifying historical orders regardless of their current
status. Existing order rows/statuses/timestamps are not rewritten during backfill;
the trigger applies on subsequent writes. Legacy balances inherit any inaccuracies
in old timestamps or current totals and need separate reconciliation if suspect.

No tables or existing order data are deleted. The migration runs inside one
transaction. It is **not idempotent**: tables, functions, indexes, and triggers use
plain `CREATE`; apply once through migration tracking, not repeated execution.

## System and application impact

- **Admin:** staff records each real receipt separately, including partial
  transfers. Corrections append reversals instead of overwriting history.
- **Payment status:** old single-order/bulk status shortcuts cannot create money
  evidence merely by stamping timestamps. Matching application changes route
  payment milestones through verified receipts.
- **Cash/COD/pickup:** handing over or delivering goods no longer implies payment.
  Record actual collection/settlement before completing delivery.
- **Storefront:** companion payment APIs compute amounts due from stored order
  totals and receipts. Customers cannot read internal receipt references, staff
  IDs, or notes through these APIs.
- **Overpayments:** reported for staff review; no automatic refund or transfer.
- **Notifications/invoices:** handled by companion application code after receipt
  commit, not by SQL triggers. The migration itself sends no email or push.
- **QR/allowlist:** local VietQR rendering, recipient allowlist, rich-text
  sanitization, and security headers are companion application changes—not
  database features installed by this migration.

Affected companion endpoints:

- Admin `GET/POST /api/orders/[id]/payments`.
- Storefront `GET /api/orders/[id]/payment` and `/payment/qr`.
- Existing admin order PATCH, bulk-status, and pickup-verification paths must
  respect the new database guards.

## Deployment

### Prerequisites

- Back up the database and rehearse against a staging copy of its actual schema.
- Confirm existing `orders`, `users`, `payment_information`, `admin_audit_log`,
  `auth.users`, Supabase roles/auth helpers, UUID generation, and referenced column
  types are compatible. Do not use only a synthetic schema as deployment proof.
- Review old paid/deposit timestamps and totals before accepting legacy balances.
- Prepare matching admin/storefront releases and a short payment-maintenance
  window. Old applications may receive guard errors once SQL is installed.

### Order of operations

1. Configure server-only `PAYMENT_BANK_ALLOWLIST` for the storefront using store
   banking-app-verified identities. Format:
   `normalized-platform-name:account-number`, comma-separated for multiple banks.
   Example: `mbbank:0123456789`. Application normalization removes platform-name
   spaces, underscores and hyphens and lowercases it; account whitespace is removed.
   Missing/mismatched configuration deliberately hides payment instructions.
   This environment variable is required by companion application code, not SQL.
2. Apply migration 158 once before releasing the matching application versions.
3. Deploy matching admin and storefront together; do not leave old status-button
   workflows live as the normal verification procedure.
4. Regenerate Supabase types through the project's normal process; do not manually
   edit generated database types.
5. Verify database permissions, staging workflows, and QR recipient details before
   reopening payments. Train staff using the linked runbook.

### Verification

Run from workspace root:

```bash
yarn test:unit
yarn type-check
yarn check:admin-auth
yarn check:rls
```

Unit coverage includes embedded PostgreSQL migration tests in
`apps/admin/src/lib/verified-payments.test.ts`, server payment-detail tests, and
VietQR encoding tests. Repository-wide failures unrelated to this migration must
be reported separately; they are not evidence of a successful deployment.

In staging, verify:

- Legacy row amounts/counts match qualifying historical orders.
- Customer/anonymous roles cannot mutate receipts, payment state, or bank config.
- Service role cannot directly insert/update/delete receipt rows; authorized RPC
  can record them with the authenticated admin identity.
- Partial → deposit → full coverage, multi-transfer orders, cash and COD work.
- Duplicate references, repeated reversals, and reference reuse after reversal
  fail; concurrent recording cannot double-credit the same reference.
- Status/timestamp-only payment and delivery bypasses fail without coverage.
- Reversals preserve originals and remove the corresponding payment coverage.
- New receipts/reversals on cancelled/refunded/returning orders are rejected.
- Bank config edits create old/new audit snapshots.
- Owner-only payment APIs hide another customer's order; no internal ledger data
  reaches storefront responses.
- QR scans in supported banking apps show the independently checked recipient,
  actual amount due, and order reference. Missing allowlist/configuration fails
  closed without offering stale payment instructions.

## Rollback and recovery

**No automatic down migration is provided. App-only rollback is not a complete
rollback:** older payment flows remain incompatible with the database guards.

- If application rollout fails, pause payment operations, keep the ledger/guards,
  and prefer a forward fix. Do not remove evidence controls to make old buttons
  work.
- If migration fails before `COMMIT`, its transaction rolls back. Investigate the
  schema/data mismatch before retrying through migration tooling.
- Once committed, do not rerun the file blindly. Inspect migration tracking and
  installed objects first.
- If the original version failed with SQLSTATE `42804` because the receipt's UUID
  `order_id` referenced the existing **text** `orders.id`, use the corrected file:
  both receipt `order_id` and RPC `p_order_id` now use text. Do not convert existing
  order IDs or drop existing order data. After the failed transaction has rolled
  back (issue `ROLLBACK;` first if the SQL session still reports an aborted
  transaction), confirm migration 158 is not recorded as applied and its new
  tables/functions are absent, then rerun the complete corrected migration. If
  any objects exist from manually executed fragments, inspect them before retrying;
  this migration is not safe to blindly reapply over partial objects.
- Before any planned reversal, export both new tables and related order/audit
  state. Preserve receipt/reference/reversal evidence and reconcile all payments
  recorded since deployment.
- Any database rollback requires a separately reviewed migration accounting for
  trigger dependencies, function/table removal, order timestamps/statuses, and
  revoked permissions. Removing guards or restoring old grants weakens security;
  never restore permissive client bank-config writes by default.
- A whole-database backup restore also discards unrelated changes after the
  backup. Use only a coordinated recovery procedure with explicit approval and
  reconciliation—not as a routine rollback command.
