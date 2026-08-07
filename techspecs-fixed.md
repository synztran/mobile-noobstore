# techspecs-fixed

A living record of security & correctness fixes. Each entry captures where the
issue came from, the root cause, and the solution we shipped.

---

## Phase 0 — Foundation: Supabase client & RLS model

> **Status:** Reference baseline (read this before any fix).
> **Why this file exists:** the main point of confusion on this project is the
> three Supabase clients (`getClient` vs `getAdminClient`) and how Row Level
> Security (RLS) relates to them. Every later entry in this file is written
> against this model.

### The three clients

| Client | File | Key used | RLS enforced? | Where it runs | Correct use |
|---|---|---|---|---|---|
| Browser client | `web/src/lib/supabase/client.ts` | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ Yes | Browser (`"use client"`) | Client components |
| SSR (user) client | `web/src/lib/supabase/server.ts` | `NEXT_PUBLIC_SUPABASE_ANON_KEY` + the **request's auth cookies** | ✅ Yes — scoped to the logged-in user via RLS | Server Components, API routes | User-scoped reads/writes |
| Admin (service-role) client | `web/src/lib/supabase/admin.ts` | `SUPABASE_SERVICE_ROLE_KEY` | ❌ **No — bypasses RLS entirely** | Server only | Admin/privileged & cron operations ONLY |

The admin app (`apps/admin/src/lib/supabase/`) mirrors this: `client.ts`,
`server.ts`, `admin.ts`.

### Why the keys matter

- `NEXT_PUBLIC_*` keys are shipped to the browser. That is fine — they are the
  **anon key** and are gated by RLS.
- `SUPABASE_SERVICE_ROLE_KEY` is server-only (no `NEXT_PUBLIC_` prefix, in
  `.env`, gitignored) and consumed only inside `getAdminClient()`. It acts as an
  **RLS bypass**: every query through it sees the whole table, unrestricted.
- Rule: **never import `getAdminClient()` into a `"use client"` file**, and
  never let an end-user request reach a service-role write before the caller's
  identity + permission have been verified.

### How RLS works here (belt-and-suspenders)

RLS is the **database-layer** guard. When a query runs through the **browser or
SSR client**, Postgres checks RLS policies and the caller's `auth.uid()`, so a
row the user isn't allowed to see simply isn't returned. Under the **service-role
client**, those policies are skipped — Postgres trusts the caller because the
service key is a privileged credential.

Consequence:
- The anon/SSR path is *not* a substitute for business/auth logic, but it limits
  blast radius (a bad query only leaks/edits what RLS permits).
- The service-role path provides **no** row-level isolation, so the only thing
  protecting the data is the **authorization code in the route handler**. If that
  code is missing a check, the service key hands out full access.

**Golden rule:** Authorize the role in server code (e.g. `requireAdmin()`), and
let RLS handle row scoping with the non-admin clients. Do not make
`getAdminClient()` the first call a request hits.

### Known gap confirmed during the audit (tracked for Phase 3 / M3)

- `public.profiles` has RLS enabled with owner-scoped policies
  (`001_create_profiles_table.sql`).
- The **`public.users`** table (used for app data + `role`) is referenced in
  migrations (`008...`) but its `CREATE TABLE`/`ENABLE ROW LEVEL SECURITY`/
  policies are **not** in the committed migration set. Its live RLS state in the
  database is unconfirmed. If `users` is not RLS-protected, a logged-in client
  could read or write `role` directly via the Supabase JS client.
- **Action (Phase 3):** verify + `ENABLE ROW LEVEL SECURITY` and policies on
  `users` and every sensitive table (orders, vouchers, gift_cards, gacha_*,
  reward_items, rank_history) in the live DB.

### Authorize-in-code reference

Before any privileged operation:
```ts
import { createClient } from "@/lib/supabase/server"; // user (RLS) — NOT admin

const supabase = await createClient();
const { data: { user } } = await supabase.auth.getUser();
if (!user) return /* 401 */;

const { data: profile } = await supabase
  .from("users").select("role").eq("id", user.id).maybeSingle();
if (profile?.role !== "admin") return /* 403 */;

// Only now is it safe to use getAdminClient() for privileged work.
```

---

## Phase 1 — CRITICAL: Admin API authorization

> **Status:** Shipped & type-checked (0 new TS errors).
> **Scope:** all `apps/admin/src/app/api/**/route.ts` handlers.

### Issue origin

The admin app routes used `getAdminClient()` (service-role, RLS bypass) as the
**first** call in each handler with **no caller verification**. Anyone with a
valid session cookie for *any* role (or, for cookie-only middleware, even an
expired/malformed cookie) could reach privileged writes, including `PATCH
/apps/admin/api/users/[id]` — a **privilege-escalation** path where a low-priv
caller could change `users.role` to `admin`.

### Root cause

No code-level authorization gate. Middleware only checked *cookie presence*
(fail-open), and the service-role client does the reverse of RLS: it trusts the
caller indiscriminately.

### Solution

1. **Admin middleware is the single authority for `/api/*`** —
   `apps/admin/src/middleware.ts` gates **every** `/api/*` route (the sensitive,
   data-bearing layer) with the authoritative check: `@supabase/ssr`
   `createServerClient` + `auth.getUser()` (JWT signature + expiry) **and**
   `users.role === "admin"` against `public.users`. Unauthenticated API calls get
   `401`, non-admin get `403`, both as JSON (never a redirect). Since admin
   authorization lives entirely in middleware, **new admin API routes are
   protected automatically** — there is no per-route `requireAdmin()` call to
   remember (the helper was removed). Refreshed auth cookies are copied onto
   every return (success and lockout) so a token refresh never drops the
   session. Middleware therefore closes the role access gap (C2) and hardened
   the cookie-only surface (C3).
2. **Pages use a lightweight cookie check** — non-`/api` navigation reuses the
   repo's cheap `hasValidSession()` (reads the `sb-*-auth-token` cookie, no SDK
   import, no DB round trip), redirecting to `/login` when absent. This mirrors
   the proven `apps/web/src/middleware.ts` pattern: it keeps the Edge bundle
   small and avoids a fail-closed lockout of the whole panel if Supabase is
   briefly unreachable on a page view. Real JWT/role verification for pages is
   still done by server components/routes.
3. **`users/[id] PATCH` escalation fix** — on top of the middleware gate, added a
   **self-demotion guard**: an admin cannot change their own `role` away from
   `admin` (prevents accidental/permanent lockout), using the SSR user client to
   resolve the current `user.id`.
4. **`crawling/webhook` is the only `/api` bypass** — the external
   changedetection.io callback has no browser session, so it is excluded from
   middleware auth and gets a fail-closed shared-secret gate instead:
   `CRAWLING_WEBHOOK_SECRET` (env) must match the `Authorization: Bearer …` or
   `x-webhook-secret` header, compared with `timingSafeEqual`. Unconfigured ⇒
   401 (fail closed).
5. **Bypass guard** — `scripts/verify-admin-auth.mjs` (`yarn check:admin-auth`)
   fails CI if the middleware matcher drops `/api` or any `/api` path is
   bypassed beyond `crawling/webhook`.

### Verification

- `yarn workspace @noobstore/admin type-check`: **0 new errors** introduced
  (15 pre-existing failures remain, all in `crawling/*`/`vendors/*` unrelated to
  auth).
- `yarn lint` is **unusable repo-wide** (pre-existing): `next lint` is deprecated
  in Next.js 15 and prompts interactively, failing in non-TTY on both apps —
  unrelated to these changes.

---

## Phase 2 — HIGH: Cron fail-open, service-role race conditions

> **Status:** Shipped & type-checked (web: 0 errors; admin: unchanged 15
> pre-existing).

### 2a. Cron / job routes were FAIL-OPEN when `CRON_SECRET` was unset

**Issue origin:** the three background-task routes each inlined
`if (cronSecret) { …return 401 }` / `if (CRON_SECRET && …)`. When the env var
was missing in any environment, the check was **silently skipped** and the route
ran with zero auth — yet each route performs destructive service-role mutations
(bulk order cancellation, payment-reminder stamping, mass rank recomputation).

**Root cause:** the "guard only if env set" anti-pattern.

**Solution:** new `apps/web/src/lib/auth/requireCronSecret.ts` — **fail-closed**,
returns `503` when `CRON_SECRET` is unconfigured and `401` on mismatch, using a
constant-time `timingSafeEqual` comparison. Applied to all three routes:
- `apps/web/src/app/api/cron/compute-ranks/route.ts`
- `apps/web/src/app/api/jobs/cancel-expired-orders/route.ts`
- `apps/web/src/app/api/jobs/payment-reminders/route.ts`

### 2b. Service-role `claimed_count` increments were non-atomic (oversell race)

**Issue origin:** customer-reachable routes that award limited rewards wrote
`claimed_count: staleValue + 1` via the service-role client after an advisory
(stale) read. Two concurrent redemptions could both read `claimed_count = N`
and both write `N + 1`, overselling `max_quantity`/stock — and in
`rewards/redeem`, the increment only ran for the *voucher* reward type.

**Root cause:** read-then-write without a conditional guard, plus admin-client
writes not protected by RLS.

**Solution:** compare-and-set on the write (`eq("claimed_count", staleValue)` +
`select("id")`), treating **zero affected rows as "sold out"**:
- `apps/web/src/app/api/gacha/route.ts` — atomic increment; on CAS failure the
  token is refunded and the draw returns `409` instead of overselling.
- `apps/web/src/app/api/rewards/redeem/route.ts` — unit is **reserved before
  points are spent** (so a lost race never costs the user points), and the CAS
  now applies to all reward types, closing the earlier voucher-only gap.

### 2c. CSRF assessment (no code change required)

All state-changing admin/storefront flows use Supabase session cookies, which
are set with `SameSite=Lax` — cross-site POST requests do **not** carry the
cookie, so browser-based CSRF cannot reach the newly-gated authed routes.
Combined with the Phase 1 middleware gate and the secret-gated cron/webhook
endpoints, no token-based CSRF defense was added. If a session cookie is ever
configured with `SameSite=None` (e.g. cross-subdomain
auth), re-open this item and enforce an Origin check in the auth layer.

### Verification

- `yarn workspace @noobstore/web type-check`: **0 errors**.
- `yarn workspace @noobstore/admin type-check`: 0 new (15 pre-existing).

### 2d. Checkout anonymous orders — closed (product decision)

`apps/web/src/app/api/checkout/submit/route.ts` previously accepted anonymous
orders (`p_user_id: user?.id ?? null`) even though the `/checkout` page is
auth-gated by middleware. **Decision: require login.** The route now returns
`401` when `auth.getUser()` yields no user, aligning the API with the UI and
removing the remaining HIGH service-role risk from the audit.

---

## Phase 3 — MEDIUM/LOW: token exposure, weak RNG, users RLS

> **Status:** Shipped & type-checked (web 0 errors; admin 0 new / 15 pre-existing).

### 3a. Sign-in endpoint echoed the full session

**Issue:** `apps/web/src/app/api/auth/signin/route.ts` returned `{ ok, session }`,
echoing `access_token`, `refresh_token` and provider tokens back to the client.
The `AuthProvider` already falls back to reading the session from its cookie via
`supabase.auth.getSession()`, so the tokens in the JSON body were unnecessary
and only increased the surface for token leakage (logs, caches, mirrors).

**Fix:** response is now just `{ ok: true }`. Session state is recovered from the
cookie set by the SSR client; client-side auth state still populates correctly.

### 3b. Weak `Math.random` for generated codes & lottery draw

**Issue:** redeemable voucher codes, order numbers, the gacha reward draw, and an
admin upload filename used `Math.random()`, which is not a CSPRNG and is
process-global — unsuitable for codes that grant value or for a paid reward draw.

**Fix:** new `apps/web/src/lib/random.ts` (`randomFloat`, `randomBase36`,
`randomHex`) backed by Node `crypto`. Applied to:
- `rewards/redeem` voucher code (`RE-XXXXXX`, same shape)
- `api/gacha/route.ts` weighted reward roll (`randomFloat()`)
- `checkout/submit` + `service-orders` + `service-bookings` order numbers
- admin `upload/route.ts` filename (`crypto.randomUUID()`)

Client-side `Math.random` uses in UI-only code (`GachaMachine`, booking entryId)
were left untouched — they are cosmetic/client identifiers, not credentials.

### 3c. Row-Level Security on `public.users`

**Issue:** the `users` table (referenced by migration 008) has no RLS in the
committed migrations — a logged-in user-client caller could read/update any
user's row, including `role` (privilege escalation). The crash-equivalent of the
C2 role-escalation fix from Phase 1, but at the DB layer.

**Fix:** new `supabase/migrations/025_users_rls.sql` (idempotent):
- `ENABLE ROW LEVEL SECURITY` on `users`.
- `REVOKE ALL` from `anon`; grants `SELECT` + `INSERT(id,email,first_name,
  last_name,phone_number)` + `UPDATE(first_name,last_name,phone_number)` to
  `authenticated`.
- Owner-scoped policies (`auth.uid() = id`) for SELECT / INSERT / UPDATE.
- `role`, `points_balance`, `rank_id`, `rank_updated_at` are NOT update-granted,
  so customers cannot escalate their own role or tweak their points.

**Important:** apply with `supabase db push`. Confirm no legacy trigger writes
`role`/`points` under the `anon`/`authenticated` role at the column grants above,
which are the only columns the app writes via the user client. Other sensitive
tables (`vouchers`, `gift_cards`, `gacha_*`, `reward_*`, `rank_history`) were
created outside the committed migrations; their RLS remains a tracked follow-up
because enabling it requires per-table read policies (e.g. `GET /api/gacha`
reads all active rewards anonymously) and live-schema reconciliation.

### Verification

- `yarn workspace @noobstore/web type-check`: **0 errors**.
- `yarn workspace @noobstore/admin type-check`: 0 new (15 pre-existing
  unrelated).

### Automated tests

API-level security tests were added using the repo's existing Playwright runner:
- `e2e/specs/web-security.spec.ts` — asserts storefront guards: storefront
  `checkout/submit` returns `401` unauthenticated; `signin` rejects missing
  credentials and, on success, does **not** echo a `session`; cron/job routes
  are fail-closed (`>=400`, never `200`) without/with a bad secret.
- `e2e/specs/admin-security.spec.ts` — asserts the middleware gate rejects
  unauthenticated calls on representative admin routes (`/api/users`,
  `/api/users/[id]` role-escalation PATCH, `/api/upload`, `/api/orders/bulk-status`).

The Playwright config gained an `admin` project (base URL `:3001`) alongside the
existing `web` project. Run with `yarn test:e2e` (needs both dev servers running
and seeded e2e credentials: `E2E_TEST_EMAIL` / `E2E_TEST_PASSWORD`).

Vitest unit tests cover the pure security helpers deterministically
(`yarn test:unit`, no server needed):
- `apps/web/src/lib/random.test.ts` — CSPRNG contract (range, charset, length,
  uniqueness).
- `apps/web/src/lib/auth/requireCronSecret.test.ts` — fail-closed: match ⇒
  allowed; wrong/missing secret ⇒ 401; unset env ⇒ 503. (9 tests total.)

The admin authorization gate is enforced by middleware (verified by
`scripts/verify-admin-auth.mjs`), so it needs no unit test.

The CAS oversell, RLS, and webhook/cron secret helpers are covered here plus the
fail-closed HTTP assertions above and the DB migration.

---

_Next entries (in progress):_
- Phase 3 follow-up — RLS policies for the remaining sensitive live-DB tables.