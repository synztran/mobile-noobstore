import { getRedis } from "./client";
import { revalidateTag } from "next/cache";

/**
 * Lazy accessor — resolving the Redis client at module scope would throw
 * during `next build` when Upstash env vars are absent from the build
 * environment (route modules get evaluated for the manifest). Errors now
 * surface only if a handler actually runs unconfigured.
 */
function redis() {
  return getRedis();
}

export const CACHE_VERSION = "v2";

/**
 * TTL for the product LIST cache (`products:v2:*`), shared by the /shop SSR
 * path and /api/products.
 *
 * MUST stay equal to the product DETAIL cache TTL (the Redis
 * `v2:product:slug:*` entries and the `unstable_cache` wrapper around
 * `getProductBySlug` are both 300s). They were 600s vs 300s, which meant that
 * when an invalidation sweep failed silently the listing stayed stale twice as
 * long as the product page — surfacing as "the listing says sold out but the
 * product page says available". Keep them in lockstep.
 */
export const PRODUCT_LIST_CACHE_TTL = 300;

/** TTL for product detail entries (`v2:product:slug:*`). See above. */
export const PRODUCT_DETAIL_CACHE_TTL = 300;

/**
 * Canonical Redis cache keys, shared by API routes (read path) and the
 * warm-up job so the two can never drift apart.
 */
export const CACHE_KEYS = {
  fees: "config:fees",
  paymentInformation: "payment-information",
  shippingMethods: "shipping-methods",
  servicesList: "services:list",
  serviceDetail: (slug: string) => `services:slug:${slug}`,
  bookingConfig: "services:booking-config",
  blogList: (category: string, page: number, limit: number) =>
    `blog:list:${category}:${page}:${limit}`,
  communityPostList: (type: string, page: number, limit: number) =>
    `${CACHE_VERSION}:community:posts:${type}:${page}:${limit}`,
  documentList: (page: number, limit: number, query?: string) =>
    `${CACHE_VERSION}:community:firmwares:${page}:${limit}:${query ?? ""}`,
  rewards: (offset: number, limit: number) => `rewards:${offset}:${limit}`,
  pointsBalance: (userId: string) =>
    `${CACHE_VERSION}:points-balance:${userId}`,
  testimonials: `${CACHE_VERSION}:testimonials`,
  creators: `${CACHE_VERSION}:creators`,
  quickPick: (
    categorySlug: string,
    productId: string,
    search: string,
    limit: string,
    sort: string
  ) => `quick-pick:${categorySlug}:${productId}:${search}:${limit}:${sort}`,
  wards: (city: string, district: string) => `wards:${city}:${district}`,
  noteworthy: (categorySlug: string, limit: number) =>
    `${CACHE_VERSION}:noteworthy:${categorySlug}:${limit}`,
  saleProducts: (categorySlug: string, limit: number, sort: string) =>
    `${CACHE_VERSION}:sale-products:${categorySlug}:${limit}:${sort}`,
} as const;

/**
 * Build the canonical cache key for the product-list endpoint. Shared by the
 * SSR `getProducts` path and the `/api/products` route so a single warm entry
 * serves both, instead of the historical `products:ssr:` / `products:` split.
 * Params whose only valid value is "default" (empty search, empty category,
 * 0 price bounds) map to the same normalized forms on both callers today.
 *
 * `soldOutLast` MUST be part of the key: it changes the ORDER of the same rows
 * (available first, sold-out after). Omit it and a flag-on /shop entry would
 * collide with a flag-off /api/products/sale entry for the same filters and
 * serve the wrong ordering.
 */
export function buildProductListCacheKey(params: {
  search?: string;
  categorySlug?: string;
  brand?: string;
  priceMin?: number;
  priceMax?: number;
  sort?: string;
  limit?: number;
  offset?: number;
  slim?: boolean;
  soldOutLast?: boolean;
}): string {
  const {
    search = "",
    categorySlug = "",
    brand = "",
    priceMin = 0,
    priceMax = 0,
    sort = "newest",
    limit,
    offset = 0,
    slim = false,
    soldOutLast = false,
  } = params;
  return `products:${CACHE_VERSION}:${search}:${categorySlug}:${brand}:${priceMin}:${priceMax}:standard,kit,component:${sort}:${limit ?? ""}:${offset}:${slim ? "slim" : "full"}:${soldOutLast ? "sol" : "nosol"}`;
}

/**
 * Read a value from Redis cache.
 * Returns null on cache miss or if Redis is unavailable (fail-open).
 */
export async function getCache<T>(key: string): Promise<T | null> {
  try {
    return await redis().get<T>(key);
  } catch {
    return null;
  }
}

/**
 * Write a value to Redis cache with a TTL.
 * Fails silently — a cache write failure must never break the API response.
 */
export async function setCache<T>(
  key: string,
  value: T,
  ttlSeconds?: number
): Promise<void> {
  try {
    if (ttlSeconds !== undefined) {
      await redis().set(key, value, { ex: ttlSeconds });
    } else {
      await redis().set(key, value);
    }
  } catch {
    // non-fatal
  }
}

/**
 * Delete one or more cache keys.
 * Fails silently — invalidation failure only causes stale data, not errors.
 */
export async function invalidateCache(...keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  try {
    await redis().del(...keys);
  } catch {
    // non-fatal
  }
}

/**
 * Delete every key matching a glob pattern (SCAN + DEL).
 *
 * Still non-fatal — an invalidation failure must not fail the caller's request
 * — but it is NO LONGER SILENT. A swallowed sweep leaves the storefront serving
 * stale stock for up to a full TTL, which looks exactly like a data bug ("the
 * listing says sold out but the product page says available"). Logging the
 * pattern makes a cache failure diagnosable instead of a ghost.
 *
 * Shared by both the web and admin apps so the invalidation key-set is kept
 * in one place (they read/write the same Upstash Redis).
 */
export async function invalidateCacheByPattern(pattern: string): Promise<void> {
  try {
    const keys = await redis().keys(pattern);
    if (keys.length > 0) {
      await redis().del(...keys);
    }
  } catch (err) {
    console.warn(
      `[cache] invalidateCacheByPattern("${pattern}") failed — entries will serve stale data until their TTL expires:`,
      err,
    );
  }
}

/**
 * Invalidate every product-facing cache entry affected by a stock or product
 * change. Call after order placement/confirmation, cancellation/refund
 * (stock restore), and manual inventory edits so the shop/product pages never
 * serve stale stock beyond a cache TTL.
 *
 * Keys mirror the readers in `modules/products/server` and the product API routes.
 * Note `CACHE_VERSION` is "v2" — do not reintroduce the old `v1:` prefixes.
 */
export async function invalidateProductCaches(): Promise<void> {
  await Promise.all([
    invalidateCache("brands", "categories", "v2:product-seo-data"),
    invalidateCacheByPattern("products:*"),
    invalidateCacheByPattern("v2:product:slug:*"),
    invalidateCacheByPattern("v2:product-detail:*"),
    invalidateCacheByPattern("v2:related-products:*"),
    invalidateCacheByPattern("v2:fbt:*"),
    invalidateCacheByPattern("v2:purchase-count:*"),
    invalidateCacheByPattern("v2:noteworthy:*"),
    invalidateCacheByPattern("v2:sale-products:*"),
    invalidateCacheByPattern("v2:newest-products:*"),
    invalidateCacheByPattern("v2:search:suggestions:*"),
    invalidateCacheByPattern("v2:component-rules:*"),
    invalidateCacheByPattern("quick-pick:*"),
    invalidateCacheByPattern("v2:quick-pick:*"),
    revalidateTag("products"),
  ]);
}

/**
 * In-flight read-through fetches, keyed by cache key. Lets N concurrent
 * requests that miss the same key share one upstream Supabase query instead
 * of stampeding it (each concurrent request used to run its own cascade).
 */
const inflight = new Map<string, Promise<unknown>>();

/**
 * Read-through cache: return the cached value when present, otherwise run
 * `fetcher` and store the result for `ttlSeconds`. Callers use this for
 * global (non-personalized) read endpoints.
 *
 * Concurrent misses for the same key are coalesced into a single `fetcher`
 * run (single-flight) — the rest of the in-flight requests await the same
 * promise rather than re-running the query.
 */
export async function readThroughCache<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>
): Promise<T> {
  const existing = inflight.get(key);
  if (existing) return existing as Promise<T>;

  const cached = await getCache<T>(key);
  if (cached !== null) return cached;

  const promise = (async () => {
    try {
      const value = await fetcher();
      await setCache(key, value, ttlSeconds);
      return value;
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, promise);
  return promise;
}

/**
 * Standard public cache headers for global read endpoints:
 *   - `max-age`: browser cache (repeat visits within 60 s hit zero network)
 *   - `s-maxage`: shared/CDN cache
 *   - `stale-while-revalidate`: serve stale while refreshing in the background
 */
export function publicCacheHeaders(): Record<string, string> {
  return {
    "Cache-Control":
      "public, max-age=60, s-maxage=60, stale-while-revalidate=300",
  };
}
