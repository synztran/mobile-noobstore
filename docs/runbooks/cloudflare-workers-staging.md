# Cloudflare Workers staging

## Scope and safety

- Worker name: `noobstore-web-staging`; deploy URL stays on `workers.dev`.
- The existing Vercel deployment remains production and fallback. Do not change production DNS, Vercel settings, or scheduled database jobs as part of staging.
- Supabase and Upstash remain the existing services. No Cloudflare cron trigger is configured; current database schedulers remain authoritative.
- Do not use a real checkout/payment while smoke-testing.

## Required setup

Add these GitHub repository secrets before manually running `.github/workflows/deploy-cloudflare-staging.yml`:

- `CLOUDFLARE_API_TOKEN`: scoped to Workers Scripts edit and the account resources needed for deploy.
- `CLOUDFLARE_ACCOUNT_ID`: Cloudflare account ID for the `noobteam` account.

Set runtime variables/secrets in the Cloudflare Worker dashboard for the staging Worker. Use staging-appropriate values and do not place secret values in git, workflow logs, or issue reports.

### Names referenced by app code

Potentially required depending on the routes/features under test:

- Public Supabase config: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Server secrets: `SUPABASE_SERVICE_ROLE_KEY`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `CRON_SECRET`, `NOTIFICATION_INTERNAL_SECRET`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `GA4_MP_API_SECRET`, `BETTERSTACK_TOKEN`, `FB_APP_SECRET`.
- Other runtime config used by specialized routes: `GOONG_API_KEY`, `GOOGLE_DISTANCE_MATRIX_API_KEY`, `STORE_ADDRESS`, `STORE_LAT`, `STORE_LON`, `DISTANCE_INCLUDED_KM`, `DISTANCE_PER_KM`, `NOMINATIM_USER_AGENT`, `PAYMENT_BANK_ALLOWLIST`, `NEXT_PUBLIC_COOKIE_DOMAIN`, `NEXT_PUBLIC_APP_URL`, and integration-specific notification/push/email settings.
- Public values embedded in client bundles (for example analytics, hCaptcha, social links, and web-push public key) must be supplied at build time for the Cloudflare workflow if those features are expected. Do not treat a `NEXT_PUBLIC_*` value as secret.

This is an initial code-reference list, not a guarantee that every route is configured. Audit runtime/build logs and Cloudflare env requirements before broad testing. In particular, do not set `NEXT_PUBLIC_COOKIE_DOMAIN` to `.noobstore.xyz` on the `workers.dev` host; leave it unset so auth cookies remain host-scoped.

## Build and local preview

From repository root:

```sh
yarn install --immutable
yarn workspace @noobstore/web exec opennextjs-cloudflare build
yarn workspace @noobstore/web exec opennextjs-cloudflare preview
```

Local preview listens on Wrangler's displayed URL (default `http://127.0.0.1:8787`).

## Deploy

1. Configure the GitHub secrets above and Worker runtime vars/secrets in Cloudflare.
2. Run **Deploy Cloudflare staging (web)** manually from GitHub Actions.
3. Confirm the resulting hostname ends in `.workers.dev` and the Worker name is `noobstore-web-staging`.
4. Do not set custom domains/routes or point production DNS to the Worker.

## Smoke checklist

- `GET /`, `/shop`, `/login`, `/api/health`, and a public read API.
- A product detail route and representative remote images (Supabase and another configured image host).
- Supabase sign-in/session refresh and one protected read-only route, using a staging-safe account.
- Checkout page renders; never submit a real order/payment.
- Check Worker logs for runtime import errors, failed external requests, and missing bindings. Do not expose secret values in logs.
- Confirm Vercel remains the production target; existing Supabase database schedules still run independently.

## Rollback

For staging only, stop dispatching the workflow or remove the staging Worker from Cloudflare. Do not delete Vercel resources, production DNS, or database schedules.

Production cutover requires a separate review, runbook, and explicit approval.
