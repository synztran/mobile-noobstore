# Cloudflare Workers Staging Design

## Goal

Deploy the existing `apps/web` Next.js 15 storefront to a Cloudflare Worker staging URL while keeping Vercel as the sole production host and preserving Supabase and Upstash services.

## Scope and non-goals

- In scope: Cloudflare OpenNext build/deploy path, staging Worker configuration, required runtime compatibility, secrets/config inventory, staging verification, and a rollback/cutover runbook.
- Out of scope: production DNS changes, disabling Vercel, migrating Supabase/Upstash, moving scheduled database jobs, or changing business behavior.

## Architecture

- Use `@opennextjs/cloudflare` and Wrangler to adapt the existing Next.js app to Cloudflare Workers.
- Deploy a separately named staging Worker on `workers.dev`; do not attach production domains or route production traffic to it.
- Preserve the existing Vercel GitHub Actions workflow and `prd` deployment as production/fallback.
- Continue using existing Supabase and Upstash resources through environment bindings/secrets configured for the staging Worker.
- Keep database-triggered scheduled jobs (including Supabase `pg_cron` → `pg_net` cache warming) on their current scheduler. Cloudflare Cron Triggers are not part of this migration.

## Compatibility work

Audit and verify Next.js middleware, App Router route handlers, Supabase SSR cookie handling, Node-specific APIs and packages (`resend`, `bwip-js`, `isomorphic-dompurify`/`jsdom`, `sharp`), and image optimization. Use Cloudflare-supported Node compatibility only where required and documented. Replace or disable the default Next.js image optimizer for Worker output if the adapter requires it; preserve remote image behavior with a supported loader/Cloudflare Images strategy only if needed for staging.

Build failures or unsupported runtime behavior must be fixed narrowly and recorded. Do not add optional Cloudflare products or migrate unrelated dependencies.

## Configuration and secrets

- Keep Worker config isolated to the web app or a root config with explicit monorepo paths, following OpenNext's supported layout.
- Bind all non-public credentials as Cloudflare Worker secrets; set public `NEXT_PUBLIC_*` values as Worker vars only when required by the build/runtime.
- Reuse existing credential values only after explicit confirmation and never commit secrets.
- Inventory the exact required variables from server/client code and the current Vercel project; do not print values in logs.

## Deployment workflow

1. Add a manual or branch-scoped GitHub Actions staging workflow, separate from production deploy.
2. Install immutable dependencies, build OpenNext output, and deploy the staging Worker using Cloudflare credentials stored as GitHub secrets.
3. Avoid automatic production environment/domain bindings. The staging URL must be `workers.dev` until staging is accepted.
4. Keep Vercel deployment workflow unchanged.

## Verification and acceptance

- OpenNext build succeeds from repository root with Yarn 4 monorepo layout.
- Worker deploys to staging and serves public pages/assets.
- Smoke-test `/`, `/shop`, product detail, `/login`, `/api/health`, public cached API, and auth-dependent flows using staging-safe test accounts.
- Verify Supabase SSR sign-in/session refresh/cookies and a read-only protected API call.
- Verify checkout page renders but do not submit a real order or payment.
- Verify image loading, route-handler behavior, and error logging; confirm no production hostname or secret leaks into staging output.
- Production remains on Vercel throughout this phase. Any later DNS cutover requires a separate reviewed runbook and explicit approval.

## Rollback

Staging rollback is to stop deploying or remove the staging Worker; production needs no rollback because Vercel remains unchanged. Do not delete Vercel project settings, credentials, DNS records, or workflows during staging work.

## Risks

- Some Node packages or Next.js runtime features may not be compatible with Workers even with Node compatibility enabled.
- Next.js image optimization behavior differs from Vercel and needs a deliberate staging solution.
- Supabase auth cookies and domain configuration may behave differently on the `workers.dev` hostname.
- Existing application code may depend on Vercel headers/environment variables; validate and avoid assuming Vercel-specific headers in the Cloudflare deployment.
