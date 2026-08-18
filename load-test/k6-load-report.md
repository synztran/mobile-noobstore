# K6 Load Test Report — NoobStore Production APIs

## Metadata

| Field | Value |
|---|---|
| **Target** | `https://www.noobstore.xyz` (production) |
| **Date** | 2026-08-18 21:16–21:17 (ICT) |
| **Tool** | k6 v2.2.0 (darwin/arm64) |
| **Script** | `load-test/k6-load.js` |
| **Duration** | 1m00s |

## Test Profile

| Scenario | Executor | Load | Endpoints |
|---|---|---|---|
| `products` | `constant-vus` | 50 VUs, full-burst, 1m | sale, noteworthy, products list, quick-pick |
| `cart` | `shared-iterations` | 30 VUs, exactly 30 iterations | `/api/cart` (rate-limit aware: kept < 100 req/min/IP) |

**Requests sent:** 11,382 (~184.9 req/s) · **Failed:** 0 (0.00%)
**Data transferred:** 497 MB received (8.1 MB/s) · 1.6 MB sent

## Results per Endpoint

| Endpoint | Component | Avg | Med | p95 | p99 | Max | Checks |
|---|---|---|---|---|---|---|---|
| `/api/products` (list) | ShopPageClient | **608 ms** | 650 ms | **776 ms** | 1.09 s | 2.94 s | 100% |
| `/api/products/sale` | SaleSection | 156 ms | 60 ms | 170 ms | 4.29 s | 5.18 s | 100% |
| `/api/products/quick-pick` | QuickPickDrawer | 169 ms | 63 ms | 296 ms | 4.33 s | 6.40 s | 100% |
| `/api/products/noteworthy` | NoteworthySection | 118 ms | 60 ms | 174 ms | 2.13 s | 3.14 s | 100% |
| `/api/cart` | CartDrawer | — | — | — | — | — | 100% (0% failed) |

> `cart` ran its own 30-iteration scenario; per-iteration timing was not subdivided by k6 (anonymous path short-circuits at `cart/route.ts:100` with `{ cart_id: null, items: [] }`).

## Threshold Results

| Threshold | Result | Value |
|---|---|---|
| `http_req_duration p(95) < 500ms` (overall) | ✗ **FAIL** | p95 = 720 ms |
| `{endpoint:noteworthy} p(95) < 500ms` | ✓ | 174 ms |
| `{endpoint:noteworthy} p(99) < 1000ms` | ✗ | 2.13 s |
| `{endpoint:products} p(95) < 500ms` | ✗ **FAIL** | 776 ms |
| `{endpoint:products} p(99) < 1000ms` | ✗ | 1.09 s |
| `{endpoint:quickpick} p(95) < 500ms` | ✓ | 296 ms |
| `{endpoint:quickpick} p(99) < 1000ms` | ✗ | 4.33 s |
| `{endpoint:sale} p(95) < 500ms` | ✓ | 170 ms |
| `{endpoint:sale} p(99) < 1000ms` | ✗ | 4.29 s |
| `{endpoint:cart} failed rate < 0.05` | ✓ | 0.00% |

**6 of 10 thresholds passed.** Critical failures: overall p95 and the `/api/products` list p95.

## Key Findings

### 1. `/api/products` list is the hotspot
- avg **608 ms** vs 118–169 ms for the other three product endpoints — ~4× slower.
- Does **not** respond evenly under load: median 650 ms, p95 776 ms, p99 1.09 s.
- Worst-case outliers (2.94 s) suggests heavy `getProducts` → `getProductListByFilters` DB work per request (kit supplements, gift supplements, variants, count query) — with Redis TTL (300 s) not absorbing the burst.

### 2. Tail latency problem on all product endpoints (p99 2–6 s)
- p95 stays green for sale/quickpick/noteworthy, but p99 spikes to 2.1–4.3 s.
- Max latency: quickpick **6.4 s**, sale **5.18 s**, noteworthy **3.14 s**.
- Signature = cache misses + Supabase connection pool pressure at peak, or cold-start first touches populating Redis.

### 3. `/api/cart` at 30 req — clean, no rate-limit hits
- 30/30 iterations `200 OK`, **0% failed**, so the middleware IP limiter (100 req/min) never tripped. Scenario sizing is correct.

### 4. Zero HTTP errors end to end
- 11,382 requests, 0 errors; all 5 check validators passed 100%.

## Recommendations

1. **Reduce `/api/products` weight** — the largest win. Profile `getProductListByFilters` (products-server.ts:295→product-query-service.ts:413): consider splitting the shape enrichment (variants/kit stock/gifts) from pagination, or raising the Redis TTL above 300 s and warming the campaign keys so bursts hit cache.
2. **Preload/cache the four landing-section keys** (sale, noteworthy, quick-pick, products page-1) with the existing warm-up job to kill p99 cold-miss spikes.
3. **Verify Supabase pool size / pgbouncer** — p99 tail jitter points at connection acquisition under 50-VU concurrency.
4. **Optional**: re-run with `--summary-trend-stats=p(50),p(95),p(99),max` for repeat-comparison snapshots after tuning.

## Reproduction

```bash
k6 run load-test/k6-load.js
# override target:
k6 run load-test/k6-load.js -e BASE_URL=https://example.com
```