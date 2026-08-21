# K6 Load Test Report #3 — NoobStore Production APIs (post slim + CDN-cache fix)

## Metadata

| Field | Value |
|---|---|
| **Target** | `https://www.noobstore.xyz` (production) |
| **Date** | 2026-08-19 (ICT) |
| **Tool** | k6 v2.2.0 (darwin/arm64) |
| **Script** | `load-test/k6-load.js` |
| **Duration** | 1m00s |
| **Baseline** | `k6-load-report-2.md` (failing run) |

## Test Profile

Same as baseline: `products` scenario = 50 VUs full-burst 1m (sale, noteworthy, product list, quick-pick); `cart` scenario = 30 shared iterations (rate-limit aware).

## Results per Endpoint

| Endpoint | Component | Report #2 avg | **Today avg** | Report #2 p95 | **Today p95** | **Today p99** | **Today max** | Checks |
|---|---|---|---|---|---|---|---|---|
| `/api/products` (list) | ShopPageClient | ~502 ms | **91 ms** | 712 ms | **146 ms** | 345 ms | 2.78 s | 100% |
| `/api/products/sale` | SaleSection | 57 ms | **120 ms** | 88 ms | **147 ms** | 371 ms | 6.56 s | 100% |
| `/api/products/quick-pick` | QuickPickDrawer | 59 ms | **119 ms** | 93 ms | **172 ms** | 360 ms | 4.08 s | 100% |
| `/api/products/noteworthy` | NoteworthySection | 57 ms | **95 ms** | 90 ms | **157 ms** | 391 ms | 2.81 s | 100% |
| `/api/cart` | CartDrawer | — | — | — | — | — | — | 100% (0% failed) |

**Requests sent:** 27,526 ≈ 456 req/s (2× report #2) · **Failed:** 0 (0.00%)
**Overall:** avg 108 ms, med 66 ms, p95 162 ms, max 6.56 s

## Threshold Results — ALL 10 PASS ✓

| Threshold | Report #2 | Today | Result |
|---|---|---|---|
| `http_req_duration p(95) < 500ms` (overall) | 677 ms ✗ | 162 ms | ✓ |
| `{endpoint:noteworthy} p(95) < 500ms` | 90 ms ✓ | 157 ms | ✓ |
| `{endpoint:noteworthy} p(99) < 1000ms` | 1.22 s ✗ | 391 ms | ✓ |
| `{endpoint:products} p(95) < 500ms` | 712 ms ✗ | 146 ms | ✓ |
| `{endpoint:products} p(99) < 1000ms` | 1.11 s ✗ | 345 ms | ✓ |
| `{endpoint:quickpick} p(95) < 500ms` | 93 ms ✓ | 172 ms | ✓ |
| `{endpoint:quickpick} p(99) < 1000ms` | 3.93 s ✗ | 360 ms | ✓ |
| `{endpoint:sale} p(95) < 500ms` | 88 ms ✓ | 147 ms | ✓ |
| `{endpoint:sale} p(99) < 1000ms` | 3.9 s ✗ | 371 ms | ✓ |
| `{endpoint:cart} failed rate < 0.05` | 0.00% ✓ | 0.00% | ✓ |

**10 of 10 thresholds passed** (up from 6/10). First fully green run.

## What Fixed It (two bugs in `/api/products`)

The slim payload (55.8 KB → **16.7 KB**) was live but the endpoint still took ~550 ms on every hit because of two route bugs:

1. **No CDN cache headers.** The route returned bare `NextResponse.json()` → Vercel sent `cache-control: public, max-age=0, must-revalidate`, so every request hit the origin function → cross-region Upstash read + JSON re-serialization ≈ 450 ms flat. Quick-pick applied `publicCacheHeaders()` (`max-age=60, s-maxage=60, stale-while-revalidate=300`) — Vercel CDN served it (`x-vercel-cache: STALE`), hence quick-pick's previously-good latency despite a *larger* 69 KB payload. **Fix: products route now returns `publicCacheHeaders()`.**

2. **Cache-key mismatch.** The route built the cache key **without** `slim`, so it read/wrote the `:full` key while the cron warm-up and SSR `getProducts` warmed the `:slim` key — the API never saw the warmed slim entry. Verified live (Upstash REST): `:full` held 16,670 B, `:slim` TTL = -2 (absent). **Fix: `slim: true` now passed to `buildProductListCacheKey`.**

## Key Evidence

- Requests served doubled: 13,306 → 27,526 (456 req/s) with 0 failures — the CDN absorbed the burst.
- `/api/products` 456 req/s, p95 146 ms, previous p95 was 712 ms at ~220 req/s.
- All p99s now under 400 ms (were up to 3.9–6.5 s).

## Reproduction

```bash
k6 run load-test/k6-load.js
# override target:
k6 run load-test/k6-load.js -e BASE_URL=https://example.com
```