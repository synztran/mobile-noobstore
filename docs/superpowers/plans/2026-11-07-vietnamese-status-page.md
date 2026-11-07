# Vietnamese Public Status Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish a Vietnamese Better Stack status page and reduce NoobStore's public health endpoint to a safe aggregate contract.

**Architecture:** Better Stack remains the status/incident system of record and hosts `status.noobstore.xyz`; the app exposes only aggregate `/api/health` status, and the existing cron consumes that contract to manage the health incident. Storefront adds one external link; no incident database, customer report form, or Better Stack proxy is introduced.

**Tech Stack:** Next.js App Router, TypeScript, Vitest, Better Stack Status Pages and existing Better Stack incident client, Vercel Cron.

**Spec:** `docs/superpowers/specs/2026-11-07-vietnamese-status-page-design.md`

## Global Constraints

- Public status must not expose Supabase URL, table names, row counts, SQL/PostgREST errors, SQLSTATE codes, exception messages, credentials, customer data, or internal monitor URLs.
- `BETTERSTACK_TOKEN` remains server-only; public page and JSON API require no private key.
- Health probes are bounded, read-only, and return aggregate status only; auth reachability uses the session client, while catalog/config probes use the server-only admin client.
- Better Stack outage must not block `/api/health`, checkout, or other purchase flows.
- No schema/RLS changes and no customer incident-report form.
- Do not add dependencies.

## Review Focus

- Auth works but the active product catalog query fails: return `degraded` without internal details.
- The fees/config row is missing or query fails: return `degraded` without internal details.
- Catalog query succeeds with zero active products: treat dependency as reachable and return `healthy`; zero products is not a database outage.
- Health handler throws before producing a status: return generic `error` without exception text; verify cron treats non-2xx as unreachable.
- Better Stack API/token failure: do not leak API response/token; cron returns controlled error and logs sanitized details.
- Missing/unverified custom status domain: storefront link must not be enabled until Better Stack page and DNS are live; document rollout gate.

---

## File Structure

- Modify `apps/web/src/app/api/health/route.ts`: bounded probes for Supabase Auth, active product catalog, and required checkout fees config; minimal public JSON response.
- Modify `apps/web/src/app/api/cron/health-check/route.ts`: consume aggregate status, remove raw table/error incident summaries, preserve source deduplication and resolve behavior.
- Create `apps/web/src/app/api/health/route.test.ts`: public-contract and aggregate-status tests with mocked Supabase clients.
- Create `apps/web/src/app/api/cron/health-check/route.test.ts`: cron auth, health state mapping, Better Stack dedupe/resolve tests.
- Modify `apps/web/src/components/home/HomeFooter.tsx`: add external `Trạng thái dịch vụ` link to configured public URL after DNS is ready.
- Modify `apps/web/.env.example`: document `NEXT_PUBLIC_STATUS_PAGE_URL=https://status.noobstore.xyz`.
- Update spec with actual Better Stack component names, translation publication, status URL and DNS verification evidence during rollout; no secret values.

### Task 1: Make the public health endpoint safe and meaningful

**Files:**
- Modify: `apps/web/src/app/api/health/route.ts`
- Create: `apps/web/src/app/api/health/route.test.ts`

**Interfaces:**
- Produces public GET contract: `{ status: "healthy" | "degraded" | "error" }` only.
- Health status uses `supabase.auth.getSession()` for auth reachability, a read-only `products.id` query filtered to `is_active = true` with limit 1, and a read-only `fees.id` query for `id = 1` using the server-only admin client. Zero active product rows are healthy if the query succeeds. Query errors mark the dependency degraded. Never query `users` as anon.

- [ ] **Step 1: Write contract tests**
  - `returns only aggregate status and no infrastructure metadata when healthy` asserts exact JSON keys are `status` and value is `healthy`.
  - `returns degraded when product catalog probe fails` asserts HTTP 200 and exact body `{ status: "degraded" }`.
  - `returns degraded when fees config probe fails` asserts HTTP 200 and exact body `{ status: "degraded" }`.
  - `returns healthy when product query succeeds with no active rows` asserts HTTP 200 and exact body `{ status: "healthy" }`.
  - `returns generic error without exception details if health evaluation throws` asserts HTTP 500 and body `{ status: "error" }`.
- [ ] **Step 2: Run tests and verify they fail**

Run: `yarn vitest run -c apps/web/vitest.config.mts src/app/api/health/route.test.ts`

Expected: current handler fails because it returns URL, table details, counts, and raw error text.

- [ ] **Step 3: Implement minimal health contract**
  - Replace the all-table exact-count loop with auth-session, active-product-existence, and fees-row probes.
  - Use the service-role client for product/config reads and select only `id`; do not request exact counts or return row data.
  - Keep `dynamic = "force-dynamic"`; status failures return generic aggregate status only.
- [ ] **Step 4: Run tests**

Run: `yarn vitest run -c apps/web/vitest.config.mts src/app/api/health/route.test.ts`

Expected: all five health contract tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/api/health/route.ts apps/web/src/app/api/health/route.test.ts
git commit -m "fix(health): expose aggregate status only"
```

### Task 2: Preserve cron incident lifecycle on aggregate health

**Files:**
- Modify: `apps/web/src/app/api/cron/health-check/route.ts`
- Create: `apps/web/src/app/api/cron/health-check/route.test.ts`

**Interfaces:**
- Consumes `{ status: "healthy" | "degraded" | "error" }` from `/api/health`.
- Keeps `HEALTH_SOURCE = "noobstore-health-check"`, five-minute cron behavior, Better Stack dedupe, and resolution on healthy.
- Customer-visible incident summary/cause is generic and contains no table names or raw server exception.

- [ ] **Step 1: Write cron tests**
  - `rejects missing cron secret before health/Better Stack calls` asserts 401 and no downstream fetch.
  - `resolves existing incident on healthy` asserts `bsFindBySource` and `bsResolve` calls.
  - `creates one generic incident for degraded` asserts summary/cause omit dependency names and raw errors.
  - `deduplicates an already-open degraded incident` asserts no duplicate `bsTrigger` call.
- `treats non-2xx health response as monitor error` asserts a generic 502 response and no response-body leakage; dependency failures are reported by `/api/health` as HTTP 200 with `degraded` status and do trigger the incident lifecycle.
- [ ] **Step 2: Run tests and verify they fail**

Run: `yarn vitest run -c apps/web/vitest.config.mts src/app/api/cron/health-check/route.test.ts`

Expected: current cron testability/incident text does not satisfy the new minimal contract.

- [ ] **Step 3: Update cron mapping and sanitized incident content**
  - Remove table parsing and failed-table summaries.
  - Map `healthy` to resolve and `degraded`/`error` to one generic incident; treat non-2xx health responses as generic monitor errors without leaking response details or attempting a second Better Stack request.
  - Keep payment security alert drain behavior and cron-secret protection unchanged.
- [ ] **Step 4: Run cron tests**

Run: `yarn vitest run -c apps/web/vitest.config.mts src/app/api/cron/health-check/route.test.ts`

Expected: all five cron tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/api/cron/health-check/route.ts apps/web/src/app/api/cron/health-check/route.test.ts
git commit -m "fix(health): sanitize status incidents"
```

### Task 3: Add storefront status link and public configuration

**Files:**
- Modify: `apps/web/src/components/home/HomeFooter.tsx`
- Modify: `apps/web/.env.example`

**Interfaces:**
- `NEXT_PUBLIC_STATUS_PAGE_URL` is required for the footer link; omit the link while unset, and enable it only after Better Stack page/custom DNS is verified.
- Link label is exactly `Trạng thái dịch vụ`; external navigation uses `<a target="_blank" rel="noopener noreferrer">`.

- [ ] **Step 1: Add/adjust footer test if a colocated test pattern exists**
  - Assert the footer renders the Vietnamese label and points to configured URL.
  - If this component has no test harness, use the existing web type-check plus direct review of the rendered anchor; do not add a new testing dependency.
- [ ] **Step 2: Add the link and env example**
  - Document `NEXT_PUBLIC_STATUS_PAGE_URL=https://status.noobstore.xyz` in `apps/web/.env.example` (commented until the status page domain is verified).
  - Render the footer link beside policy/terms/delivery links only when the URL is configured, with safe external-link attributes.
- [ ] **Step 3: Verify**

Run: `yarn workspace @noobstore/web type-check`

Expected: pass; manual browser check confirms link target and Vietnamese label.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/home/HomeFooter.tsx apps/web/.env.example
git commit -m "feat(status): link Vietnamese service status"
```

### Task 4: Configure Better Stack and production rollout (operations)

**Files:** No repository files unless deployment evidence needs to be recorded in the spec.

**Interfaces:**
- Public URL: `https://status.noobstore.xyz`.
- Better Stack is the public source of truth; app code does not proxy the public JSON API.

- [ ] **Step 1: Configure Better Stack page**
  - Set customer-facing service components (Storefront, Checkout, Orders/Payments, Support); do not expose DB table names.
  - Publish Vietnamese translation for navigation, aggregate states, components, incidents, timestamps, and subscriptions.
  - Enable public incident history and email subscriptions; configure automatic incident reports only for approved monitors.
- [ ] **Step 2: Configure custom domain**
  - Set `status.noobstore.xyz` in Better Stack and add its documented CNAME in Matbao DNS.
  - Verify TLS, page loads, `index.json` returns only intended public content, and subscription flow works.
- [ ] **Step 3: Deploy health+cron changes together**
  - Verify `/api/health` responses for healthy/degraded/error contain only the `status` key.
  - Trigger a controlled non-production health failure or mocked test and verify one incident is created; restore healthy and verify it resolves.
  - Confirm no incident remains open after the test.
- [ ] **Step 4: Enable storefront link**
  - Set `NEXT_PUBLIC_STATUS_PAGE_URL` in Vercel and deploy only after domain/TLS verification.
  - Verify footer link reaches the public page.

## Final verification

- `yarn workspace @noobstore/web type-check`
- `yarn vitest run -c apps/web/vitest.config.mts src/app/api/health/route.test.ts src/app/api/cron/health-check/route.test.ts`
- `git diff --check`
- Inspect public `/api/health` and Better Stack `index.json` to ensure neither includes secrets, project URL, table details, raw errors, or customer data.
