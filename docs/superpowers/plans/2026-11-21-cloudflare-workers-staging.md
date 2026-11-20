# Cloudflare Workers Staging Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and deploy the existing Next.js storefront to an isolated Cloudflare Workers staging URL without changing production hosting.

**Architecture:** OpenNext adapts `apps/web` to Workers. A separate manual GitHub Actions workflow deploys to a `workers.dev` staging worker; Vercel remains the production deploy target. Supabase, Upstash, and current database-driven schedules remain unchanged.

**Tech Stack:** Next.js 15 App Router, OpenNext for Cloudflare, Cloudflare Workers/Wrangler, Yarn 4 workspaces, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-11-21-cloudflare-workers-staging-design.md`

## Global Constraints

- Do not change production DNS, Vercel project settings, or the Vercel deploy workflow.
- Do not migrate Supabase, Upstash, or scheduled database jobs.
- Do not check secrets into source control or print them in build output.
- Do not run a real checkout/payment during staging verification.
- Package changes require explicit owner approval before editing manifests, lockfiles, or installing.

## Review Focus

- Workers Node compatibility missing or insufficient — verify required compatibility flags and run Worker preview.
- Supabase SSR cookies/session refresh fail on `workers.dev` — test login, refresh, and a protected read-only route.
- Runtime-only Node package import breaks unrelated routes at startup — identify imports and smoke-test affected routes.
- Next image optimizer is unavailable or changes image delivery — verify representative Supabase/Cloudinary images.
- Environment variable or secret is missing/leaked — inventory names, bind secrets, and inspect staging output without exposing values.

---

## File Map

- Create `apps/web/open-next.config.ts`: OpenNext Cloudflare adapter configuration.
- Create `apps/web/wrangler.jsonc`: staging Worker name, entry point, compatibility date/flags, assets, and non-secret bindings.
- Modify `apps/web/package.json` and root `yarn.lock`: approved adapter/deploy packages and focused scripts.
- Modify `apps/web/next.config.js` only for verified Worker compatibility (including image handling); preserve Vercel behavior where possible.
- Create `.github/workflows/deploy-cloudflare-staging.yml`: manual or feature-branch-only staging deploy; never production DNS.
- Create/update `docs/runbooks/cloudflare-workers-staging.md`: variable-name inventory, setup steps, smoke-test checklist, and staging rollback.
- Add focused config/compatibility tests only where behavior is non-trivial and can be tested without Cloudflare credentials.

## Task 1: Resolve and approve package versions

**Files:** None until approval; then `apps/web/package.json`, root `package.json` if workspace-level scripts are needed, `yarn.lock`.

- [x] Check current OpenNext Cloudflare and Wrangler release compatibility with this repository's Next.js 15, Node version, and Yarn 4 setup; selected `@opennextjs/cloudflare@1.20.18`, `wrangler@4.166.0`, and `next@15.5.29` after explicit approval. Tests: OpenNext build emits Worker entry/assets; local preview serves health/public routes.
- [ ] Report exact proposed versions for **`@opennextjs/cloudflare`** and **`wrangler`**, why each is needed, and compatibility risks.
- [ ] Stop and obtain explicit approval before modifying any manifest/lockfile or installing either package.
- [x] After approval, add exact compatible versions and minimal scripts (`preview`, `deploy:staging`).
- [x] Yarn updated the lockfile. `yarn install --immutable` remains to verify in CI-equivalent install.

## Task 2: Build minimal OpenNext Worker locally

**Files:**
- Create: `apps/web/open-next.config.ts`
- Create: `apps/web/wrangler.jsonc`
- Modify: `apps/web/next.config.js` only for proven adapter requirements
- Modify: `apps/web/package.json`

- [x] Configure the adapter using its documented monorepo/Next.js 15 setup and staging-only Worker name `noobstore-web-staging`.
- [x] Configure compatibility date and Node compatibility flags (`nodejs_compat`, `global_fetch_strictly_public`).
- [x] Configure `.open-next/worker.js` entry, generated assets, and worker self-reference.
- [x] OpenNext build succeeds from repository root; Vercel build configuration is unchanged.
- [x] Local preview serves `/` (200), `/login` (200), `/api/health` (200), and `/api/fees` (200). Initial preview caught a future compatibility date; fixed to `2026-11-20`.
- [x] Fix only verified config issue (unsupported future compatibility date); reran preview successfully.

## Task 3: Audit runtime features and environment bindings

**Files:**
- Create/update: `docs/runbooks/cloudflare-workers-staging.md`
- Modify: Worker config only for required non-secret vars/bindings

- [x] Inventory selected env variable names in source and record initial list in `docs/runbooks/cloudflare-workers-staging.md`; values were not read or printed. Full route-by-route audit remains.
- [ ] Categorize Node/runtime-sensitive modules (`resend`, `bwip-js`, `isomorphic-dompurify`/`jsdom`, `sharp`) by route and verify lazy loading/import compatibility.
- [ ] Verify image optimizer behavior; choose the adapter-supported staging loader/output and assert a Supabase image plus one non-Supabase remote image return successful responses.
- [x] Document existing Supabase/Upstash and `pg_cron`/`pg_net` schedules as unchanged; no Cloudflare cron triggers created.
- [ ] Confirm no code depends on Vercel-only request headers for authorization or business correctness; preserve safe fallbacks.

## Task 4: Add isolated Cloudflare staging deployment workflow

**Files:**
- Create: `.github/workflows/deploy-cloudflare-staging.yml`
- Update: `docs/runbooks/cloudflare-workers-staging.md`

- [x] Trigger only by `workflow_dispatch`; no automatic deploy from `prd`.
- [x] Workflow installs monorepo with `yarn install --immutable`, builds OpenNext output, and deploys named staging Worker.
- [x] Workflow authenticates with Cloudflare API/account GitHub secrets; no secret values are echoed.
- [x] Worker config keeps staging on `workers.dev`; workflow has no production domain or Vercel operations.
- [ ] Validate workflow syntax and inspect the diff for accidental production deploy/DNS operations.

## Task 5: Deploy and smoke-test Cloudflare staging

**Files:** No production files; update staging runbook with results.

- [ ] Configure approved Cloudflare/GitHub credentials and staging environment variables through dashboards; do not add values to git.
- [ ] Deploy staging Worker and capture its `workers.dev` URL. Requires dashboard secrets/values; not done in this session.
- [ ] Verify `/`, `/shop`, a product detail page, `/login`, `/api/health`, and a public cached API route.
- [ ] Verify Supabase SSR sign-in/session refresh and one protected read-only request using a staging-safe account.
- [ ] Verify checkout renders without submitting an order/payment; verify representative optimized images and inspect Worker logs for runtime errors.
- [ ] Confirm Vercel remains production host and record staging rollback (stop deployments/remove staging Worker only).

## Task 6: Review and handoff

**Files:**
- Update: `docs/runbooks/cloudflare-workers-staging.md`

- [x] Run unit tests (62 files, 599 tests pass), OpenNext build, local Worker preview smoke checks (`/`, `/login`, `/api/health`, `/api/fees` all 200), Wrangler deploy dry-run, immutable install, and `git diff --check`.
- [ ] Run web type-check. Current baseline errors across existing source files; type-check is not clean (examples: React Query API generics and `profile/support/new`).
- [ ] Summarize unsupported features, any route-specific limitations, staging URL, and remaining secrets/config tasks.
- [ ] Do not perform production cutover; require a separate approval and reviewed cutover plan.
