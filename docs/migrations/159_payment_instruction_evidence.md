# Migration 159 — Payment instruction evidence and security alerts

SQL: [`159_payment_instruction_evidence.sql`](../../supabase/migrations/159_payment_instruction_evidence.sql)

## Purpose

Preserve exactly which QR bytes the server issued, retain versions for disputes,
and queue security alerts without trusting customer-browser integrity reports.
This is evidence of server output, **not proof of customer viewing or payment**.

## Benefits to our system

- Trace bank recipient, amount, reference, and original PNG for each instruction version.
- Serve the same archived PNG to customers and private Telegram attachments.
- Keep prior versions when amounts or approved bank information change.
- Detect accidental evidence corruption through payload/image SHA-256 checks.
- Alert staff about recipient mismatches, bank configuration changes, and repeated
  rejected payment actions; retain bounded CSP telemetry without URLs or script samples.
- Keep evidence private and accessible through role-checked admin endpoints.

## Database changes

- `payment_instruction_evidence`: UUID ID, **text** order FK, per-order version,
  fingerprint, bank JSON snapshot, amount, reference, exact payload, original PNG
  stored as base64, SHA-256 hashes, server timestamp. PNG input capped at 1 MB of
  base64 text. Index supports newest-version reads. No public storage bucket.
- `payment_evidence_delivery`: append-only application log of Telegram `sent` or
  `failed` attempts and customer response `prepared` events; includes Telegram
  message ID or authenticated customer actor when available.
- `issue_payment_instruction_evidence(...)`: service-role-only SECURITY DEFINER
  RPC, fixed search path. Locks order, checks current ledger balance/reference
  and bank config, reuses latest identical fingerprint or appends next version.
- `payment_security_alerts`: hourly `(kind, source_key)` buckets, occurrence count,
  delivered timestamp; no raw browser report bodies or recipient account numbers.
- `queue_payment_security_alert(text,text)`: service-role-only queue RPC.
- Replaces `audit_payment_configuration()` while retaining its existing old/new
  audit records; adds a configuration-change alert in the same transaction.

All new tables enable RLS. Client roles have no direct grants. Service role can
only SELECT evidence, SELECT/INSERT delivery events, and SELECT/UPDATE alert
buckets. Evidence writes require the RPC; PUBLIC/client execution is revoked.
Database owners can still alter records; this is not external notarization or WORM.

## System behavior and companion code

- Checkout notification reads saved order totals, deposit percentage/amount and
  remaining balance, delivery method, recipient phone/name and non-pickup address.
  It explicitly says money is not yet verified. Pickup omits delivery address.
- After order creation, server attempts to issue evidence and send original PNG
  through Telegram `sendDocument`, not a recompressed photo.
- Authenticated QR endpoint validates current payment details, persists/reuses an
  evidence version, logs a prepared response, and returns archived bytes with
  evidence ID/hash headers. Failure to preserve evidence prevents QR serving.
- Admin order payment panel lists historical QR versions with private downloads.
- Current ledger balance is rechecked while order is locked; a concurrent payment
  may cause a retry rather than issuing a stale amount.
- Evidence fingerprints include recipient name/config identity and payload; this
  preserves old versions even if an earlier amount returns later.
- Telegram delivery retries on subsequent QR requests when no success is recorded.
  Concurrent requests or network ambiguity can produce duplicate Telegram messages;
  exactly-once delivery is not guaranteed. Order success does not depend on Telegram.
- Recipient mismatches queue immediate eligible alerts; config writes queue alerts
  transactionally. RPC payment rejections queue per-admin counts. Five rejections
  or CSP reports in an hourly bucket qualify for notification; these counts are
  diagnostic signals, not proof of an attacker. Unauthorized requests are still
  rejected by existing auth controls; this change does not centrally log every 401.
- Existing protected health-check cron drains eligible alerts, up to 20 per run.
  Delivery failures leave alerts queued. Reports below threshold are not emailed.
- CSP report-only script policy discovers compatibility issues, including normal
  Next.js inline scripts. It does **not** block scripts or constitute a strict
  nonce-based CSP rollout. Endpoint accepts bounded legacy CSP reports and stores
  only allowlisted directive counts, with rate limiting.

## Existing data

No existing rows are backfilled, rewritten, or removed. Historical orders gain
evidence only when new instructions are issued. No claim is made about QR bytes
served before deployment. Migration requires 158's receipts and configuration audit.
It runs transactionally and is not idempotent; apply once through migration tracking.

## Deployment

1. Back up database; apply/test corrected migration 158 first. Confirm `orders.id`
   and `payment_information.id` are text, `auth.users.id` is UUID.
2. Rehearse 159 on staging, then apply before matching storefront/admin release.
3. Configure server-only `PAYMENT_BANK_ALLOWLIST`, `TELEGRAM_BOT_TOKEN`, and
   `TELEGRAM_CHAT_ID`. Use a restricted staff-only chat: messages contain customer
   delivery PII and bank payment instructions. Confirm legal/privacy retention policy.
4. Confirm existing Upstash rate-limit variables and `CRON_SECRET`; health-check
   cron must actually run to drain alerts. No new cron schedule is installed by SQL.
5. Deploy matching admin/storefront, regenerate Supabase types through normal tooling.
6. Check report-only noise before treating reports as security events. Review a
   nonce-based enforcing policy separately; do not enable enforcement blindly.

## Verification

- Run `yarn test:unit`, `yarn type-check`, `yarn check:admin-auth`, `yarn check:rls`.
  Report unrelated repository failures separately.
- Create full and deposit orders; Telegram must show saved amounts, deposit details,
  and unverified-payment wording. Delivery shows address; pickup does not.
- Download customer/admin/Telegram PNG and compare SHA-256: all must match saved hash.
- Repeat same QR requests: latest version reused. Record partial payment or change
  approved account: next issued instruction creates a new version; old PNG remains.
- Confirm client roles cannot read evidence/delivery/security tables or execute RPCs.
- Confirm admin-only evidence access and customer ownership guards reject other orders.
- Change bank config in staging: old/new audit and alert both recorded. Trigger a
  recipient allowlist mismatch: instructions fail closed; alert bucket appears.
- Simulate Telegram failure: order remains successful, delivery failure recorded;
  later QR request can retry. Health cron retries pending security alerts.
- Submit invalid/oversized/rate-limited CSP reports; no raw URLs/script samples stored.

## Rollback and recovery

No automatic down migration. A failed transaction rolls back all 159 changes.
After commit, preserve evidence, hashes, delivery records, and configuration audits.
Prefer forward fixes and do not delete dispute evidence to restore old UI.

App-only rollback removes archived-QR serving/alerts but leaves tables and grants;
it must be reviewed because old QR code may regenerate rather than serve evidence.
Any SQL rollback needs a separate reviewed migration restoring migration 158's
configuration audit function before removing alert objects. Do not drop its audit
trigger or weaken client permissions. Export data and reconcile versions before
any destructive changes. Backup restoration loses unrelated later writes too.

## Evidence limitations and operations

`prepared` means the server prepared an authenticated response—not that a browser
received or displayed it. Telegram success means Telegram accepted a document,
not that staff read it. No customer screenshot is collected or trusted. Hashes are
integrity checks, not a trusted timestamp or proof against privileged compromise.

PNG base64 uses database space and increases backups. No automatic deletion is
installed: choose a documented retention policy before accumulating production
evidence; retain dispute-relevant records. Current operational queries must monitor
storage growth and pending delivery/alert failures. Telegram evidence delivery is
best-effort; private database evidence remains the primary record.
