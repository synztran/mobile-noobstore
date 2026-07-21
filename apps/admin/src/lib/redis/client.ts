import { Redis } from "@upstash/redis";

let _redis: Redis | null = null;

export function getRedis(): Redis {
	if (!_redis) {
		const url = process.env.UPSTASH_REDIS_REST_URL || "https://credible-iguana-80228.upstash.io";
		const token = process.env.UPSTASH_REDIS_REST_TOKEN || "gQAAAAAAATlkAAIgcDJhZjJlMTg3MzRmODI0NDc1ODZmNzQ4Y2Y5YTE4YTBjMg";
		if (!url || !token) {
			throw new Error(
				"Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN env vars",
			);
		}
		_redis = new Redis({ url, token });
	}
	return _redis;
}
