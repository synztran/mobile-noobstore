import { getShippingMethods, type ShippingMethod } from "@/lib/shipping-methods";
import {
	CACHE_KEYS,
	CONFIG_CACHE_TTL,
	publicCacheHeaders,
	readThroughCache,
} from "@/lib/redis/cache";
import { NextResponse } from "next/server";

export const revalidate = CONFIG_CACHE_TTL;

export type { ShippingMethod };

export async function GET() {
	try {
		const data = await readThroughCache<ShippingMethod[]>(
			CACHE_KEYS.shippingMethods,
			CONFIG_CACHE_TTL,
			getShippingMethods,
		);

		return NextResponse.json(data, { headers: publicCacheHeaders() });
	} catch (err) {
		return NextResponse.json(
			{ error: err instanceof Error ? err.message : "Failed to load shipping methods" },
			{ status: 500 },
		);
	}
}
