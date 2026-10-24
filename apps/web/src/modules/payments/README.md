# Payments

Manual bank verification only; no provider webhook. QR is a convenience, never
evidence of payment. Staff records verified receipts through the admin app.

- `server/details.ts`: owner-scoped order read, verified ledger balance and bank
  identity. Fails closed if ledger or bank configuration cannot load.
- `server/evidence.ts`: versioned archived QR bytes, hashes, private Telegram documents.
- `server/security-alerts.ts` / `drain-alerts.ts`: durable hourly alert queue and
  protected health-cron Telegram delivery; CSP reports are untrusted telemetry.
- `vietqr.ts`: pure EMVCo/VietQR payload encoding and checksum.
- `ui/OrderPaymentInstructions.tsx`: shared server-authoritative QR and bank details.
- `app/api/orders/[id]/payment/**`: authenticated details and locally rendered PNG.

Database migration 158 owns receipt writes, duplicate prevention, correction
entries, payment timestamps and status guards. No frontend state is authoritative.
Never expose ledger references, staff identities or internal notes to customers.

Server-only `PAYMENT_BANK_ALLOWLIST` must approve configured recipient identities.
See `docs/runbooks/manual-payment-verification.md` before deployment.
Migration 159 adds private instruction evidence/delivery logs and security alerts;
see `docs/migrations/159_payment_instruction_evidence.md` for deployment and limits.
