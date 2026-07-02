import { getRedis } from "./client";

const redis = getRedis();

export async function invalidateCache(...keys: string[]): Promise<void> {
	if (keys.length === 0) return;
	try {
		await redis.del(...keys);
	} catch {
		// non-fatal
	}
}
