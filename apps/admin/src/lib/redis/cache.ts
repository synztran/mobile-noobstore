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
