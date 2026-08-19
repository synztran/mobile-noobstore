import { getRedis } from "./client";

const redis = getRedis();

export const CACHE_VERSION = "v2";

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
	pointsBalance: (userId: string) => `${CACHE_VERSION}:points-balance:${userId}`,
	testimonials: `${CACHE_VERSION}:testimonials`,
	creators: `${CACHE_VERSION}:creators`,
	quickPick: (
		categorySlug: string,
		productId: string,
		search: string,
		limit: string,
		sort: string,
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
 */
export function buildProductListCacheKey(params: {
	search?: string;
	categorySlug?: string;
	priceMin?: number;
	priceMax?: number;
	sort?: string;
	limit?: number;
	offset?: number;
	slim?: boolean;
}): string {
	const {
		search = "",
		categorySlug = "",
		priceMin = 0,
		priceMax = 0,
		sort = "newest",
		limit,
		offset = 0,
		slim = false,
	} = params;
	return `products:${CACHE_VERSION}:${search}:${categorySlug}:${priceMin}:${priceMax}:standard,kit,component:${sort}:${limit ?? ""}:${offset}:${slim ? "slim" : "full"}`;
}

/**
 * Read a value from Redis cache.
 * Returns null on cache miss or if Redis is unavailable (fail-open).
 */
export async function getCache<T>(key: string): Promise<T | null> {
	try {
		return await redis.get<T>(key);
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
	ttlSeconds?: number,
): Promise<void> {
	try {
		if (ttlSeconds !== undefined) {
			await redis.set(key, value, { ex: ttlSeconds });
		} else {
			await redis.set(key, value);
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
		await redis.del(...keys);
	} catch {
		// non-fatal
	}
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
	fetcher: () => Promise<T>,
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
