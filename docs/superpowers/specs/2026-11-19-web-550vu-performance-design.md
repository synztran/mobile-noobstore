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

### 2. Shared API timeout/deadline

Implement a web-only two-layer deadline contract:

1. Middleware attaches a bounded internal deadline/timeout hint to matched API requests. Middleware alone cannot enforce a timeout on the handler after `NextResponse.next()`.
2. A shared API-handler utility consumes that deadline and returns a stable safe 504 response when the handler exceeds it. It must preserve existing status/body behavior when the handler completes before the deadline.
3. Pass `AbortSignal` to outbound `fetch` operations where supported so the underlying work can stop. A `Promise.race` against a Supabase/PostgREST query only bounds how long the caller waits; unless cancellation is confirmed for the installed client/runtime, document that database work may continue after a 504.
4. Do not apply the wrapper blindly to streaming responses, long-running uploads/exports, cron/jobs, webhooks, or payment/order mutations. Inventory routes and classify them before rollout; route-specific exemptions/overrides must be explicit and tested.
5. Never treat client-provided deadline headers as trusted configuration: middleware overwrites the internal header, clamps values to the configured maximum, and handlers reject malformed/missing values safely.

### 3. Client render-cost audit

Profile newly added `apps/web` client components associated with the performance effort under realistic interaction and data sizes. Use React Profiler/browser measurements to identify repeated expensive renders. Apply memoization, state localization, or list-windowing only when measurements and component boundaries justify it. Do not add blanket `memo` wrappers; server-rendered components and request concurrency are not addressed by client memoization.

## Error and Safety Behavior

- Timeout response is HTTP 504 with a stable generic customer-safe message; do not expose database/provider details.
- A timeout must not convert an uncertain write into an automatic retry. Mutations may have completed after the client receives 504; preserve idempotency and communicate that limitation.
- Keep existing auth, rate-limit, RLS, and API error-code behavior intact.
- No build command during verification because running dev servers share `.next` artifacts. Use targeted type-check/tests/static checks.

## Acceptance Criteria

- Baseline captures the Grafana scenario, route latency/error distribution, database CPU/connections/locks/cache metrics where available, and the top bottleneck paths; no index is added without query-plan evidence.
- Any approved index migration includes synchronized system-impact documentation and a verification/rollback note.
- An API handler exceeding its configured deadline returns 504 within the expected bound; a handler completing in time returns its normal response. Exempt routes and streaming responses retain their required behavior.
- Outbound fetches using the shared helper observe cancellation; database cancellation claims are made only if verified against the actual Supabase/PostgREST setup.
- Newly added UI components changed for render performance have before/after profiler evidence and preserve behavior.
- `apps/web` targeted type-check/tests pass, and no unrelated admin/warehouse or dirty web feature work is included accidentally.

## Out of Scope

- Admin and warehouse performance.
- Broad database schema redesign, speculative indexes, or index removal without usage evidence.
- Changing business logic, payment semantics, caching policy, or rate-limit policy as a side effect of a timeout wrapper.
- Rebuilding the app or claiming 550 VU/s is solved without rerunning the same Grafana workload and comparing measurements.

## Open Evidence Requirement

The exact 550 VU/s Grafana panel/test definition, target routes, latency/error breakdown, deployment/runtime limits, and database telemetry are not present in the repository. Obtain these before selecting index changes or declaring a performance bottleneck fixed.
