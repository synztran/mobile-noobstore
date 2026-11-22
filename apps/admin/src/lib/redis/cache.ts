import { getRedis } from "./client";

// The shared web lib owns the full-surface (v2-prefixed) product key set so
// both apps sweep the exact same keys — keeping it in the web lib avoids the
// historical v1/v2 drift where admin patterns never matched.
export { invalidateCacheByPattern } from "@web-cache";
import {
	invalidateProductCaches as invalidateProductCachesWeb,
	invalidateCacheByPatternStrict,
} from "@web-cache";

// Admin and web are separate Next runtimes sharing one Upstash Redis: the
// Redis sweep below clears the REST-level cache, but revalidateTag() called
// inside admin only marks admin's own entries. The web app's
// unstable_cache({ tags: ["products"] }) results and the ISR'd /shop/[slug]
// pages need an explicit purge on the web side — bridge over HTTP after
// every product mutation so both apps drop stale data in lockstep.
const WEB_REVALIDATE_URL = (
	process.env.WEB_APP_URL ?? "https://www.noobstore.xyz"
).replace(/\/$/, "") + "/api/cache/revalidate";

async function notifyWebRevalidate(): Promise<void> {
	const secret = process.env.NOTIFICATION_INTERNAL_SECRET;
	if (!secret) return;
	try {
		await fetch(WEB_REVALIDATE_URL, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"x-internal-secret": secret,
			},
			body: JSON.stringify({ tags: ["products"] }),
			cache: "no-store",
			signal: AbortSignal.timeout(5_000),
		});
	} catch (err) {
		// Non-fatal: worst case the web cache self-heals within its revalidate
		// window. Logged, not swallowed — a failed purge means the storefront
		// serves stale stock for up to a full TTL, which presents as a data bug
		// ("listing says sold out, product page says available") and is very
		// hard to diagnose without this line.
		console.warn(
			`[admin/cache] failed to notify web revalidate (${WEB_REVALIDATE_URL}) — storefront may serve stale product data:`,
			err,
		);
	}
}

/**
 * Full-surface product invalidation: sweeps the shared Redis key set AND
 * tells the web app to revalidate its tagged Data Cache / ISR entries.
 */
export async function invalidateProductCaches(): Promise<void> {
	await Promise.all([
		invalidateProductCachesWeb(),
		invalidateCacheByPatternStrict("v2:noteworthy:*"),
		invalidateCacheByPatternStrict("v2:sale-products:*"),
	]);
	await notifyWebRevalidate();
}

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

export async function invalidateFeesCache(): Promise<void> {
	await invalidateCache("config:fees");
	try {
		const webUrl = process.env.WEB_APP_URL;
		const secret = process.env.CRON_SECRET;
		if (!webUrl || !secret) throw new Error("Missing web warm-up configuration");
		const response = await fetch(
			`${webUrl.replace(/\/$/, "")}/api/cron/warm-cache?refresh=fees`,
			{
				method: "POST",
				headers: { Authorization: `Bearer ${secret}` },
				cache: "no-store",
				signal: AbortSignal.timeout(5_000),
			},
		);
		if (!response.ok) throw new Error(`Fee cache warm-up returned ${response.status}`);
	} catch (error) {
		console.error("[admin/cache] failed to refresh web fee cache:", error);
	}
}

/**
 * Narrower invalidation used by the admin "clear products cache" flow:
 * product list + quick-pick only. `invalidateProductCaches()` is the
 * full-surface variant.
 */
export async function invalidateProductsCache(): Promise<void> {
	await Promise.all([
		invalidateProductCaches(),
	]);
}
