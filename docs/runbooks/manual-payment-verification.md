# Manual payment verification

## Deployment order

1. Back up database and rehearse migration `158_verified_order_payments.sql` in
   staging. It preserves old payment timestamps as **legacy opening balances**;
   these are not independently verified bank transactions.
2. Set server-only `PAYMENT_BANK_ALLOWLIST` on storefront. Comma-separated
   `normalized-platform-name:account-number`, e.g. `mbbank:0123456789`.
   Confirm exact values from store's own banking app. Never copy customer input.
   Missing or mismatched allowlist intentionally disables payment instructions.
3. Apply migration, then deploy admin and storefront together. Old status buttons
   cannot bypass database receipt guards after migration is installed.
4. Regenerate Supabase types using the project's normal generation process.
5. Check QR in supported banking apps against recipient, amount, order reference;
   check full/deposit/partial balances, cash pickup and COD settlement in staging.
6. Review admin access and enable MFA for admin accounts in the auth provider.

## Staff procedure

- Open order payment panel. Inspect incoming credit in **store bank app/statement**.
- Match receiving account, order reference, actual amount and bank transaction ID.
- Enter each incoming transfer separately. Never trust a customer screenshot.
- Partial amounts remain partial; a deposit can permit dispatch, but completed
  delivery requires full payment, including explicitly recorded cash/COD.
- For cash use actual cash receipt reference. For COD use actual settlement
  reference; delivery notification alone is not collected money.
- Overpayment requires separate review/refund handling; never silently discard it.
- Correct a mistake using a reversal and reason, then record correct receipt.
  Original bank reference remains reserved even after reversal (prevents replay).
- Cancelled/refunded/returning orders reject new receipt records. Inspect historical
  records and handle refunds via existing refund workflow; ledger does not send money.

## Security boundaries

- QR is not proof of payment. Browser/extension compromise can still alter local
  display. Server-generated QR does not prevent DevTools tampering.
- Manual verification is staff attestation; it cannot independently verify funds.
- Receipt writes are service-role-only, admin-authorized and transactional.
- Receiving-account edits are permission-restricted and database-audited in
  `payment_configuration_audit`. Service-role writes are identifiable as service
  role, not a named human; direct operational changes need an operator ticket.
- Store bank changes require deployment allowlist review, independent from DB.
- No automated provider webhook is included.
- Rich text is sanitized and JSON-LD escapes script terminators. Basic CSP blocks
  frames, objects and external form submissions. A strict script-nonce CSP is
  still a separate rollout; these headers do not make arbitrary XSS impossible.
