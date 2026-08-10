import { getRedis } from "./client";

const redis = getRedis();

export const CACHE_VERSION = "v2";

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
