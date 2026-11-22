import { getFeesConfig, type FeesData } from "@/lib/fees";
import {
	CACHE_KEYS,
	publicCacheHeaders,
	readThroughCache,
} from "@/lib/redis/cache";
import { NextResponse } from "next/server";

export const revalidate = 3600;

export async function GET() {
	try {
		const data = await readThroughCache<FeesData>(
			CACHE_KEYS.fees,
			3600,
			getFeesConfig,
		);

		return NextResponse.json(data, { headers: publicCacheHeaders() });
	} catch (err) {
		return NextResponse.json(
			{ error: err instanceof Error ? err.message : "Failed to load fees config" },
			{ status: 500 },
		);
	}
}
