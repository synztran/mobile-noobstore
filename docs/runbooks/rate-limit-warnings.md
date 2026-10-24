# Rate-limit warnings and CSP reporting

## Production settings

Set server-only Vercel environment variables for rate-limit warnings:

```text
TELEGRAM_CHAT_ID=-1002340947239
TELEGRAM_RATE_LIMIT_THREAD_ID=1303
```

Existing `TELEGRAM_BOT_TOKEN` must have permission to send to this topic. All
notifications share `TELEGRAM_CHAT_ID`; only rate-limit warnings set the topic.
Missing/invalid topic configuration skips
rate-limit warnings instead of falling back to the general chat. Redeploy after
setting these variables; Turbo forwards them to build tasks.

## Behavior

- Normal middleware API quota remains 60 requests/minute/IP.
- Exact `/api/security/csp-report` bypasses that shared quota, but retains its own
  `csp:<IP>` limiter and 16 KiB request-body cap. It does not bypass authentication
  for any other endpoint. A reporting 429 does not produce a Telegram warning.
- Noisy script CSP report-only header is paused. Existing enforced CSP and other
  security headers remain. Restore script reporting only with tested nonce/hash
  support for legitimate Next.js scripts.
- Browser reports no longer enqueue payment-security alerts. Existing CSP alert
  rows are retained but excluded from cron delivery; no migration or deletion.
- Rate-limit warning attempts share a Redis sliding-window cooldown of one per
  IP/10 minutes across paths, plus existing global 100/minute cap. Suppressed
  events are not aggregated. Global-cap/delivery failures can consume cooldown;
  delivery is best-effort, not guaranteed or automatically retried.
- Cookie presence is a routing hint, not verified user identity. Warning wording
  explicitly avoids claiming authentication or an attack.

## Verify after deployment

1. Confirm page responses no longer include `Content-Security-Policy-Report-Only`
   but still include enforced `Content-Security-Policy`.
2. Check browser Network tab: new pages should stop producing inline-script reports.
   Old open/cached pages may continue until refreshed, but cannot spend user quota.
3. In staging, exhaust CSP endpoint quota; profile/wishlist requests should remain
   independent. Do not deliberately exhaust production customer quotas.
4. Trigger a normal API quota rejection in staging: first warning goes to topic
   1303, later rejections from same IP within cooldown produce no extra warnings.
5. Confirm payment config alerts and new-order notifications retain their existing
   chat destination. These changes do not alter payment verification.
