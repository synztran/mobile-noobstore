import {
	CACHE_KEYS,
	publicCacheHeaders,
	readThroughCache,
} from "@/lib/redis/cache";
import { getRewards } from "@/lib/rewards-server";
import type { RewardsResponse } from "@/types/reward";
import { NextRequest, NextResponse } from "next/server";

export const revalidate = 120;

export async function GET(req: NextRequest) {
	try {
		const sp = req.nextUrl.searchParams;
		const offset = Math.max(0, parseInt(sp.get("offset") ?? "0", 10));
		const limit = Math.min(
			100,
			Math.max(1, parseInt(sp.get("limit") ?? "12", 10)),
		);

		const res = await readThroughCache<RewardsResponse>(
			CACHE_KEYS.rewards(offset, limit),
			120,
			() => getRewards(offset, limit),
		);

		return NextResponse.json(res, { headers: publicCacheHeaders() });
	} catch (err) {
		return NextResponse.json(
			{ error: err instanceof Error ? err.message : "Failed to load rewards" },
			{ status: 500 },
		);
	}
}