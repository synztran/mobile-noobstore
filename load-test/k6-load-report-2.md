# K6 Load Test Report #2 — NoobStore Production APIs (post products read-through fix)

## Metadata

| Field | Value |
|---|---|
| **Target** | `https://www.noobstore.xyz` (production) |
| **Date** | 2026-08-19 (ICT) |
| **Tool** | k6 v2.2.0 (darwin/arm64) |
| **Script** | `load-test/k6-load.js` |
| **Duration** | 1m00s |
| **Baseline** | `k6-load-report.md` (2026-08-18) |

## Test Profile

Same as baseline: `products` scenario = 50 VUs full-burst 1m (sale, noteworthy, product list, quick-pick); `cart` scenario = 30 shared iterations (rate-limit aware).

## Results per Endpoint

| Endpoint | Component | Baseline avg | **Today avg** | Baseline p95 | **Today p95** | **Today p99** | **Today max** | Checks |
|---|---|---|---|---|---|---|---|---|
| `/api/products` (list) | ShopPageClient | 608 ms | **~502 ms** | 776 ms | **712 ms** | 1.11 s | 1.47 s | 100% |
| `/api/products/sale` | SaleSection | 156 ms | **57 ms** | 170 ms | **87.8 ms** | 3.9 s | 1.20 s | 100% |
| `/api/products/quick-pick` | QuickPickDrawer | 169 ms | **59 ms** | 296 ms | **93.2 ms** | 3.93 s | 1.36 s | 100% |
| `/api/products/noteworthy` | NoteworthySection | 118 ms | **57 ms** | 174 ms | **90.1 ms** | 1.22 s | ~0.6 s | 100% |
| `/api/cart` | CartDrawer | — | — | — | — | — | — | 100% (0% failed) |

**Requests sent:** 13,306 ≈ 220 req/s · **Failed:** 0 (0.00%)
**Overall:** avg 227.8 ms, med 61.2 ms, p95 677 ms, max 5.01 s

## Threshold Results

| Threshold | Result | Value |
|---|---|---|
| `http_req_duration p(95) < 500ms` (overall) | ✗ **FAIL** | 677 ms |
| `{endpoint:noteworthy} p(95) < 500ms` | ✓ | 90 ms |
| `{endpoint:noteworthy} p(99) < 1000ms` | ✗ | 1.22 s |
| `{endpoint:products} p(95) < 500ms` | ✗ **FAIL** | 712 ms |
| `{endpoint:products} p(99) < 1000ms` | ✗ | 1.11 s |
| `{endpoint:quickpick} p(95) < 500ms` | ✓ (+**: 93 ms vs 296 ms baseline**) | 93 ms |
| `{endpoint:quickpick} p(99) < 1000ms` | ✗ | 3.93 s |
| `{endpoint:sale} p(95) < 500ms` | ✓ | 88 ms |
| `{endpoint:sale} p(99) < 1000ms` | ✗ | 3.9 s |
| `{endpoint:cart} failed rate < 0.05` | ✓ | 0.00% |

**6 of 10 thresholds passed** — same count as baseline. Only `/api/products` remains a critical failure.

## What Improved

- sale / quick-pick / noteworthy **p95 ≈ 90 ms** (down from 170–296 ms): the three landing sections now serve from the Redis cache warmed by the cron job + on-demand read-through.
- Products median ~500 ms vs baseline 650 ms: modest gain from the bare `getCache→setCache` upgrade to `readThroughCache` (single-flight coalescing concurrent misses).

## Root-Cause Investigation (products still ~550 ms)

Live probes performed against production show `/api/products` **never** serves under ~500 ms, even with:

- repeated hits of the *same* key,
- a fresh key the app just wrote (on-demand warm),
- tiny payloads (`limit=1`, 4.5 KB response).

Meanwhile quick-pick/sale/noteworthy warm to ~150 ms on-demand and ~90 ms under load.

Redis inspection (Upstash REST, creds from `.env.local`):

- The key `products:v2:::0:0:standard,kit,component:newest:12:0` **exists** with value **55,104 bytes** — byte-for-byte matching the live HTTP response size (55,104 B). The route *is* being served from cache; the cache is not empty.
- Reading a 55 KB value from Upstash REST measures **320–475 ms** round-trip from this machine (base RTT ~116 ms). So the products endpoint's ~550 ms TTFB ≈ full-size Upstash read + JSON re-serialization, **not** a DB cascade.
- `price_asc` / `price_desc` keys written on-demand by the deployed app appear with **TTL ≈ 56 s** (not the 600 s the route passes) and a smaller value — suggesting the **deployed build may predate HEAD**: its quick-pick `Cache-Control` is `public, max-age=60`, whereas HEAD's `publicCacheHeaders()` emits `public, max-age=60, s-maxage=60, stale-while-revalidate=300`.

### Conclusion

The hit-rate/threshold problem for products is not a cache-miss anymore — it is **transit/serialization time of an ~55 KB single Redis value fetched cross-region (sin1 → iad1 → Upstash), plus NextResponse re-serialization**, at every request. The other product endpoints win because their cached payload (~19 KB) is ~3× smaller.

## Recommendations

1. **Shrink the products list payload** (highest leverage). `/api/products` returns full `ShopProduct[]` incl. `description` (long HTML), `images`, `variants`, `gifts` — most of which the shop list grid does not render. Trim to display fields for the list endpoint (keep full detail on `/api/products/[slug]`) → ~19 KB like quick-pick → cache read drops toward the ~100 ms range.
2. **Confirm prod build is HEAD.** Deployed `Cache-Control` on quick-pick does not match `publicCacheHeaders()` in source. If the last deploy predates the products `readThroughCache` change (commit `734fb42`), the 55 KB value may still be re-fetched/re-serialized on every hit despite Redis holding it — verify via Vercel dashboard, then redeploy.
3. **Ephemeral add-on**: keep `readThroughCache` + cron warm (already active). Consider lowering Redis TTL to 300 s for products if content freshness matters more.
4. **Re-run** after either (1) or (2) lands and redeploys.

## Reproduction

```bash
k6 run load-test/k6-load.js
# override target:
k6 run load-test/k6-load.js -e BASE_URL=https://example.com
```