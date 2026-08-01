import { getRedis } from "./client";

function redis() {
	return getRedis();
}

export async function getCache<T>(key: string): Promise<T | null> {
	try {
		return await redis().get<T>(key);
	} catch {
		return null;
	}
}

export async function setCache<T>(
	key: string,
	value: T,
	ttlSeconds?: number,
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

export async function invalidateCache(...keys: string[]): Promise<void> {
	if (keys.length === 0) return;
	try {
		await redis().del(...keys);
	} catch {
		// non-fatal
	}
}

export async function invalidateCacheByPattern(pattern: string): Promise<void> {
	try {
		const keys = await redis().keys(pattern);
		if (keys.length > 0) {
			await redis().del(...keys);
		}
	} catch {
		// non-fatal
	}
}

export async function invalidateProductsCache(): Promise<void> {
	await invalidateCacheByPattern("products:*");
}

export async function invalidateProductCaches(): Promise<void> {
	await invalidateCache("categories", "v1:product-seo-data");
	await Promise.all([
		invalidateCacheByPattern("products:*"),
		invalidateCacheByPattern("v1:product:slug:*"),
		invalidateCacheByPattern("v1:product-detail:*"),
		invalidateCacheByPattern("v1:related-products:*"),
		invalidateCacheByPattern("v1:fbt:*"),
		invalidateCacheByPattern("v1:purchase-count:*"),
		invalidateCacheByPattern("v1:quick-pick:*"),
		invalidateCacheByPattern("v1:noteworthy:*"),
		invalidateCacheByPattern("v1:sale-products:*"),
		invalidateCacheByPattern("v1:newest-products:*"),
		invalidateCacheByPattern("v1:search:suggestions:*"),
	]);
}
