import {
	CACHE_KEYS,
	publicCacheHeaders,
	readThroughCache,
} from "@/lib/redis/cache";
import { getServicesList } from "@/lib/services-server";
import { NextResponse } from "next/server";

export const revalidate = 120;

export type {
	Service,
	ServiceOption,
	ServiceOptionValue,
} from "@/lib/services-server";

// ─── GET /api/services ────────────────────────────────────────────────────────
// Returns all active services with their options and selectable values.

export async function GET() {
	try {
		const services = await readThroughCache(
			CACHE_KEYS.servicesList,
			120,
			getServicesList,
		);

		return NextResponse.json(services, { headers: publicCacheHeaders() });
	} catch (err) {
		return NextResponse.json(
			{ error: err instanceof Error ? err.message : "Failed to load services" },
			{ status: 500 },
		);
	}
}