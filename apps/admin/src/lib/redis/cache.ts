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
	// `products:*` covers list/ssr keys; quick-pick is cleared here too because
	// the kit configurator feeds off `/api/products/quick-pick` (route-level key
	// `quick-pick:*`) and server components (self-cached `v2:quick-pick:*`).
	await Promise.all([
		invalidateCacheByPattern("products:*"),
		invalidateCacheByPattern("quick-pick:*"),
		invalidateCacheByPattern("v2:quick-pick:*"),
	]);
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
		invalidateCacheByPattern("quick-pick:*"),
		invalidateCacheByPattern("v2:quick-pick:*"),
		invalidateCacheByPattern("v1:noteworthy:*"),
		invalidateCacheByPattern("v1:sale-products:*"),
		invalidateCacheByPattern("v1:newest-products:*"),
		invalidateCacheByPattern("v1:search:suggestions:*"),
	]);
}
