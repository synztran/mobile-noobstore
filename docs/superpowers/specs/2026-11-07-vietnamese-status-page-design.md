# Vietnamese Public Status Page Design

## Goal

Give NoobStore customers a Vietnamese, trustworthy place to check current service health, incident updates, and recent availability without exposing internal health-check details.

## Product direction

- Use Better Stack Status Pages as the public status system of record and host the page at `status.noobstore.xyz`.
- Configure the Better Stack page in Vietnamese using its translation feature; enable public incident history and customer subscriptions.
- Keep incident creation and updates in Better Stack/dashboard and the existing health monitor. Customers view and subscribe; this page does not accept incident reports.
- Link to the status page from the storefront and support/help surfaces where service availability is relevant.

## Current system

- `apps/web/src/app/api/health/route.ts` is public and currently returns the Supabase project URL, per-table row counts, table names, raw database errors, and an aggregate status.
- `apps/web/src/app/api/cron/health-check/route.ts` polls `/api/health` every five minutes and creates/resolves a Better Stack incident based on its response.
- `apps/web/src/lib/betterstack.ts` already creates, resolves, and finds Better Stack incidents. `BETTERSTACK_TOKEN` is server-only.
- Better Stack supports a public JSON status endpoint at `<status-page-url>/index.json`, native incident updates/subscriptions, a custom domain, and custom translations.

## Design

### Public status provider

Better Stack owns public service components, aggregate status, incident timelines, uptime history, and email subscriptions. Configure only customer-meaningful components (for example Storefront, Checkout, Order/Payment updates, and Customer support); do not mirror database table names or internal infrastructure topology. Use Vietnamese for all status labels, descriptions, announcement copy, incident templates, and subscription UI. A custom CNAME `status.noobstore.xyz` points to Better Stack's status-page target. DNS ownership/configuration is a deployment prerequisite, not an app migration.

### Health endpoint boundary

Reduce unauthenticated `GET /api/health` to a stable minimal contract:

```json
{ "status": "healthy" | "degraded" | "error" }
```

Do not return Supabase URL, table names, row counts, SQL/PostgREST errors, SQLSTATE codes, or exception messages. Keep a 200 response for a completed probe whose aggregate status is degraded, and use 500 only when the health handler itself cannot produce a status. Internal diagnostic detail remains in server logs/monitoring and must not be copied to a public incident summary.

The current anon probe flags `users` as inaccessible because customer RLS intentionally blocks anon reads. Replace the database signal with checks that represent actual customer-facing capability, using a server-only admin client where needed and low-cost bounded queries. Probe only the dependencies needed by public service components; avoid exact counts and never report them. The cron route must consume the minimal status contract and keep its current deduplication/resolve behavior.

### Storefront discovery

Add a small `Trạng thái dịch vụ` link to the existing support/help/footer navigation pointing to `https://status.noobstore.xyz`. The status page itself remains hosted by Better Stack, so storefront code does not proxy customer subscriptions or incident updates.

## Security and privacy

- Public status content is intentionally public; never publish raw exception text, project identifiers, credentials, table names, customer data, or internal monitor URLs.
- `BETTERSTACK_TOKEN` remains server-only; browser links and Better Stack's public `index.json` use no private key.
- Health checks must be bounded, read-only, and return aggregate states only.
- Incident summaries and updates use Vietnamese customer-facing language and describe impact/workaround, not implementation internals.

## Failure behavior

- If Better Stack's hosted page is unavailable, `/api/health` and checkout continue independently; the page is an information surface, not a dependency for purchase flows.
- If a dependency probe fails, return `degraded` without details; the existing cron monitor opens or keeps an incident.
- If Better Stack token/API fails in the cron, log a sanitized server-side error and return a monitor failure; do not expose the token/API response to customers.
- If status DNS is not ready, show the link only after the CNAME and Better Stack custom domain are verified; the default Better Stack URL can be used during setup.

## Rollout and verification

1. Configure the Better Stack status page, Vietnamese translation, service components, incident visibility, and subscription settings.
2. Verify the public page and `index.json` expose only intended public content; configure `status.noobstore.xyz` CNAME and verify TLS/host routing.
3. Deploy the minimal health response and update the cron consumer in the same rollout; verify healthy/degraded/error cases and incident deduplication/resolve behavior.
4. Add the storefront link and verify it opens the public status page.
5. Confirm no test incident is left open and no private health details appear in public API responses or incident text.

## Out of scope

- Customer-submitted incident/report form.
- Replacing Better Stack monitoring/on-call or building a custom incident database/UI.
- Publishing table-level health, exact uptime calculations, or a public dependency map.
- Database schema or RLS changes.
