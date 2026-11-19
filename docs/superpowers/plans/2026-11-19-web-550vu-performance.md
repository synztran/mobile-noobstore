# Web 550 VU Performance Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve measured `apps/web` behavior under the Grafana workload that failed around 550 VU/s, without speculative indexes or unsafe timeout semantics.

**Architecture:** Execute three reviewable tracks in order: establish route/DB evidence and selectively add indexes; add a browser-side 10-second default timeout helper for same-origin storefront API fetches with explicit long-running opt-outs; then profile newly added client components and optimize only demonstrated rerender costs. Browser abort protects customer-facing wait but does not guarantee server/database cancellation.

**Tech Stack:** Next.js 15 App Router, TypeScript, Supabase/PostgREST, PostgreSQL migrations, React Profiler, Grafana.

**Spec:** `docs/superpowers/specs/2026-11-19-web-550vu-performance-design.md`

## Global Constraints

- Scope is `apps/web`; do not include unrelated dirty `apps/web`, admin, warehouse, or root changes.
- Do not run `yarn build` or `next build`; shared `.next` artifacts can stop active development servers.
- No index without observed frequent-query evidence and a query plan demonstrating benefit.
- API timeout is enforced in browser fetch helpers, not middleware; browser abort does not guarantee server/database cancellation.
- Do not automatically retry mutations after timeout; preserve idempotency and safe error responses.
- Every added/changed migration requires a matching system-impact document under `docs/migrations/`.

## Review Focus

- **Unknown Grafana workload mix:** obtain exact routes, VU ramp, duration, and latency/error panels before selecting a hot path; record the baseline.
- **Server work after browser abort:** verify timeout/UI behavior without claiming the API handler or database was stopped.
- **Mutations finishing after client timeout:** ensure no automatic retry changes mutation/idempotency semantics.
- **Long-running requests:** classify uploads or other legitimate long requests and test explicit opt-outs/overrides.

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

### Task 2: Bound storefront browser API waits to 10 seconds

**Files:**
- Create: `apps/web/src/lib/api/fetch.ts` (or the established shared browser API fetch seam found during implementation)
- Modify: browser API call sites under `apps/web/src` to use the helper
- Test: helper and representative caller tests under `apps/web/src`
- Do not modify: `apps/web/src/middleware.ts` for this timeout requirement

**Interfaces:** `apiFetch(input, init?: RequestInit & { timeoutMs?: number | false }): Promise<Response>` defaults timeout to 10,000 ms for same-origin `/api/**`, including when input is a same-origin `Request`. It composes caller `signal`, clears timers, and throws a distinguishable timeout error only when its own deadline expires. `timeoutMs: false` explicitly opts out for documented long-running uploads.

- [x] Test 10-second default, timeout abort, caller-abort distinction, and explicit opt-out.
- [x] Implement `apiFetch` signal composition using `AbortController`; do not monkey-patch global fetch.
- [x] Inventory browser same-origin API calls and route them through the helper while preserving options and response handling.
- [x] Leave server-side and external-provider fetches unchanged.
- [x] Identify long-running uploads and give only those explicit timeout opt-outs.
- [x] Ensure mutation calls are never automatically retried by `apiFetch`; no retry layer was added. Existing React Query query retries are unchanged.
- [x] Run helper and full web/admin unit tests and `yarn workspace @noobstore/web type-check`.

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
