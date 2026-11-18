# Web 550 VU Performance Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve measured `apps/web` behavior under the Grafana workload that failed around 550 VU/s, without speculative indexes or unsafe timeout semantics.

**Architecture:** Execute three reviewable tracks in order: establish route/DB evidence and selectively add indexes; implement a web middleware deadline hint plus an API wrapper that returns 504 while aborting supported outbound work; then profile newly added client components and optimize only demonstrated rerender costs. Middleware cannot itself wrap downstream route-handler execution, and a timed-out DB promise may continue unless cancellation is verified.

**Tech Stack:** Next.js 15 App Router, TypeScript, Supabase/PostgREST, PostgreSQL migrations, React Profiler, Grafana.

**Spec:** `docs/superpowers/specs/2026-11-19-web-550vu-performance-design.md`

## Global Constraints

- Scope is `apps/web`; do not include unrelated dirty `apps/web`, admin, warehouse, or root changes.
- Do not run `yarn build` or `next build`; shared `.next` artifacts can stop active development servers.
- No index without observed frequent-query evidence and a query plan demonstrating benefit.
- Middleware deadline is a hint; handler wrapper enforces response deadline. Promise racing alone does not cancel Supabase DB work.
- Do not automatically retry mutations after timeout; preserve idempotency and safe error responses.
- Every added/changed migration requires a matching system-impact document under `docs/migrations/`.

## Review Focus

- **Unknown Grafana workload mix:** obtain exact routes, VU ramp, duration, and latency/error panels before selecting a hot path; record the baseline.
- **Database cancellation uncertainty:** verify actual PostgREST client cancellation behavior; assert only bounded caller wait if cancellation is unavailable.
- **Mutations finishing after 504:** test timeout response does not trigger retries or change idempotency semantics.
- **Exempt/streaming routes:** classify uploads, exports, webhooks, jobs, cron and streaming before wrapper coverage; test each exemption.
- **User-provided timeout input:** middleware must overwrite/clamp internal hints; test malformed and forged header values.

---

### Task 1: Capture performance baseline and index/query audit

**Files:**
- Read: `apps/web/src/modules/products/server/queries.ts`
- Read: `apps/web/src/modules/cart/server/service.ts`
- Read: `apps/web/src/modules/checkout/server/submit-order.ts`
- Read: `supabase/migrations/097_create_performance_indexes.sql`
- Read: `supabase/migrations/103_add_product_indexes.sql`
- Read: `supabase/migrations/112_add_query_indexes.sql`
- Create only if evidence supports index: `supabase/migrations/<next>_<purpose>.sql`
- Create migration companion only if SQL is added: `docs/migrations/<same-basename>.md`

**Interfaces:** Consume the Grafana test definition and database telemetry supplied by the owner/operator. Produce a written route/query inventory with existing index coverage, measured plans, proposed index or explicit “no index” decision, and before metrics.

- [ ] Record exact VU/s ramp, endpoint mix, duration, p50/p95/p99, error rates, and DB CPU/connections/locks/cache for the failing run.
- [ ] Map top hot routes to concrete SQL/query calls and existing indexes; inspect `EXPLAIN (ANALYZE, BUFFERS)` for those queries on representative data.
- [ ] Add an index only if plan and frequency evidence demonstrate a bottleneck; document write overhead and expected benefit. Otherwise close the task with an evidence-backed no-index report.
- [ ] If adding a migration, include companion Markdown covering purpose, affected schema, behavior, existing data, deployment verification, and rollback.
- [ ] Run targeted SQL/RLS checks applicable to the migration; do not run app build.

### Task 2: Enforce shared API response deadlines

**Files:**
- Modify: `apps/web/src/middleware.ts`
- Create: `apps/web/src/lib/api/deadline.ts`
- Create or modify: `apps/web/src/lib/api/with-api-timeout.ts` (or the smallest established route-handler wrapper seam found during implementation)
- Test: deadline helper and representative API route tests under `apps/web/src`
- Modify: only explicitly classified API routes that need outbound fetch cancellation

**Interfaces:** Middleware overwrites a private deadline header. `getApiDeadline(request: Request): number | null` returns only the validated middleware-supplied deadline. `withApiTimeout(handler, options)` returns a handler wrapper that emits safe 504 when deadline expires; options declare per-route timeout/exemption and whether the route is streaming. Shared `fetchWithDeadline(input, init, deadline)` merges an `AbortSignal` without discarding a caller-provided signal.

- [ ] Write tests for missing, malformed, forged, expired, and clamped deadline values; middleware must replace client-supplied internal deadline values.
- [ ] Test handler completion before deadline preserves status, headers, and body; test a never-resolving handler returns generic 504 at the configured bound.
- [ ] Inventory API route types and explicitly exclude streaming/long-running routes and routes whose writes cannot safely tolerate a response timeout.
- [ ] Implement deadline extraction and middleware propagation; do not imply middleware cancels downstream work.
- [ ] Implement wrapper and fetch abort composition; verify supported external fetches stop on abort.
- [ ] Probe Supabase/PostgREST cancellation experimentally. If unsupported/unverified, document that 504 bounds response wait only and database work may continue; do not claim cancellation.
- [ ] Run focused tests and `yarn workspace @noobstore/web type-check`.

### Task 3: Profile new storefront client components

**Files:**
- Profile only: new/modified client components in `apps/web` identified by current `git diff` and the target pages from the Grafana scenario.
- Modify only components whose React Profiler/browser traces show repeated costly work.
- Test: existing component/unit tests or focused tests for preserved interactions.

**Interfaces:** Use existing component props/state boundaries; no public API or business behavior change. Record profiler trace, reproduction, before/after render counts or commit duration, and affected list/data size.

- [ ] Identify which newly added storefront components participate in the stressed routes; exclude unrelated service/about/keyset/gacha work if it is not in the measured workload.
- [ ] Capture React Profiler evidence for representative navigation, typing, list growth, and animation interactions.
- [ ] Optimize only measured hotspots using localized state/memoized derived values/stable props; avoid broad memoization and behavior changes.
- [ ] Add or update focused tests for interaction behavior and run targeted tests/type-check.
- [ ] Rerun the same Grafana scenario and compare route latency/error and browser render measurements; report residual bottlenecks rather than claiming success from code changes alone.

### Task 4: Review and handoff

**Files:**
- Update: this plan with completed evidence/results if execution begins.
- No unrelated files.

- [ ] Verify branch diff contains only approved performance work; preserve all pre-existing dirty changes.
- [ ] Review timeout caveats, migration companion documentation, and before/after evidence.
- [ ] Report exact checks, failures, and whether the 550 VU/s scenario was rerun.
