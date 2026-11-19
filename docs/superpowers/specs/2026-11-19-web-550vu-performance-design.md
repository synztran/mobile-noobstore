# Web 550 VU Performance Hardening Design

## Goal

Improve `apps/web` resilience and identify measured throughput bottlenecks after Grafana load tests reached approximately 550 VU/s and the service stopped responding.

## Current State and Evidence

- `apps/web/src/middleware.ts` applies an existing 2-second timeout only to the Upstash rate-limiter promise. It fails open and does not bound downstream Route Handler or database execution.
- The Next.js App Router exposes many API routes; middleware runs before a route handler and cannot wrap or cancel its execution after `NextResponse.next()`.
- Existing migrations already add substantial indexes: `097_create_performance_indexes.sql`, `103_add_product_indexes.sql`, `112_add_query_indexes.sql`, and domain-specific migrations for carts, orders, gacha, and reviews. Avoid speculative indexes.
- Product listing work includes paged product reads and related variant/kit/gift stock shaping (`apps/web/src/modules/products/server/queries.ts`). Cart and order submission fan across multiple records (`apps/web/src/modules/cart/server/service.ts`, `apps/web/src/modules/checkout/server/submit-order.ts`). These are candidates for measurement, not proof of missing indexes.
- The web worktree currently contains unrelated new and modified features. They are not automatically included in implementation; component profiling is limited to the specific newly added storefront components identified during the audit and confirmed by baseline measurements.

## Approved Scope

### 1. Index audit and query plans

Inventory existing indexes and map the hot read/write paths to their SQL predicates and ordering. Use production-like `EXPLAIN (ANALYZE, BUFFERS)` or available database telemetry for the queries implicated by the Grafana test. Add an index only when a frequent query plan demonstrates a scan/sort bottleneck, the proposed leading columns match its predicates/order, and the write/storage cost is acceptable. Every migration must have a companion `docs/migrations/<basename>.md` document.

Initial paths to prioritize: product listing/detail reads, cart read paths, checkout/order submission, and any route that Grafana identifies as a high-latency/high-volume endpoint. Existing index coverage must be checked before proposing additions.

### 2. Shared storefront API request timeout

Use a browser-side timeout to prevent the storefront UI from waiting indefinitely for API responses. After 10 seconds without a response, abort the browser's API request and expose a recoverable timeout error.

1. Route all browser-originated same-origin `/api/**` calls through one shared helper with a 10,000 ms default timeout. This includes fetches initiated in components, hooks, stores, API-client modules, and TanStack Query functions; server-side requests and external providers are excluded.
2. Compose the helper's `AbortSignal` with any caller-provided signal and clear its timer on completion. Distinguish timeout from caller cancellation and ordinary network errors.
3. Long-running uploads or other legitimate requests may explicitly opt out or pass a longer timeout; document and test every exception. Add no automatic retries, especially for mutations. The policy covers browser-originated same-origin API calls only; server-side and external-provider fetches remain unchanged.
4. Middleware is not the enforcement point and must not add deadline hints for this purpose. Browser abort protects customer-facing wait but does not guarantee Next.js, Supabase, or PostgreSQL stops work already in progress. Server/database resource limits are separate work if telemetry shows need.
5. Preserve existing response parsing, status handling, credentials, headers, request body, and auth behavior. Do not monkey-patch global `window.fetch`.

### 3. Client render-cost audit

Profile newly added `apps/web` client components associated with the performance effort under realistic interaction and data sizes. Use React Profiler/browser measurements to identify repeated expensive renders. Apply memoization, state localization, or list-windowing only when measurements and component boundaries justify it. Do not add blanket `memo` wrappers; server-rendered components and request concurrency are not addressed by client memoization.

## Error and Safety Behavior

- Timeout abort is a distinguishable client-side timeout error with a stable, generic customer-safe message; do not expose provider details.
- A timeout must not convert an uncertain write into an automatic retry. Server/database work may finish after browser abort; preserve idempotency and communicate that limitation.
- Keep existing auth, rate-limit, RLS, and API error-code behavior intact.
- No build command during verification because running dev servers share `.next` artifacts. Use targeted type-check/tests/static checks.

## Acceptance Criteria

- Baseline captures the Grafana scenario, route latency/error distribution, database CPU/connections/locks/cache metrics where available, and the top bottleneck paths; no index is added without query-plan evidence.
- Any approved index migration includes synchronized system-impact documentation and a verification/rollback note.
- Browser API fetches with no response by 10 seconds are aborted; faster responses preserve existing behavior.
- Caller cancellation remains distinguishable from timeout; explicit long-running exceptions behave as documented.
- No claim is made that browser abort cancels server or database work.
- Newly added UI components changed for render performance have before/after profiler evidence and preserve behavior.
- `apps/web` targeted type-check/tests pass, and no unrelated admin/warehouse or dirty web feature work is included accidentally.

## Out of Scope

- Admin and warehouse performance.
- Broad database schema redesign, speculative indexes, or index removal without usage evidence.
- Changing business logic, payment semantics, caching policy, or rate-limit policy as a side effect of a timeout wrapper.
- Rebuilding the app or claiming 550 VU/s is solved without rerunning the same Grafana workload and comparing measurements.

## Open Evidence Requirement

The exact 550 VU/s Grafana panel/test definition, target routes, latency/error breakdown, deployment/runtime limits, and database telemetry are not present in the repository. Obtain these before selecting index changes or declaring a performance bottleneck fixed.
