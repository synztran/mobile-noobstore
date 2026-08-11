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
	rewards: (offset: number, limit: number) => `rewards:${offset}:${limit}`,
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
 * Read-through cache: return the cached value when present, otherwise run
 * `fetcher` and store the result for `ttlSeconds`. Callers use this for
 * global (non-personalized) read endpoints.
 */
export async function readThroughCache<T>(
	key: string,
	ttlSeconds: number,
	fetcher: () => Promise<T>,
): Promise<T> {
	const cached = await getCache<T>(key);
	if (cached !== null) return cached;

	const value = await fetcher();
	await setCache(key, value, ttlSeconds);
	return value;
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
