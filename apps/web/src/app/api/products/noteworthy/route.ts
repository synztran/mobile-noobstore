import { getNoteworthyProducts } from "@/modules/products/server/ssr";
import {
	CACHE_KEYS,
	publicCacheHeaders,
	readThroughCache,
} from "@/lib/redis/cache";
import { NextRequest, NextResponse } from "next/server";

export const revalidate = 60;

export async function GET(req: NextRequest) {
	const sp = req.nextUrl.searchParams;
	const categorySlug = sp.get("category")?.trim() ?? "";
	const limit = sp.get("limit") ? Number(sp.get("limit")) : 8;

	const safeLimit = Number.isFinite(limit)
		? Math.min(Math.max(1, Math.floor(limit)), 100)
		: 8;

	try {
		const result = await readThroughCache(
			CACHE_KEYS.noteworthy(categorySlug, safeLimit),
			1800,
			() => getNoteworthyProducts({ categorySlug, limit: safeLimit }),
		);

		return NextResponse.json(result, { headers: publicCacheHeaders() });
	} catch (err) {
		return NextResponse.json(
			{ error: err instanceof Error ? err.message : "Unknown error" },
			{ status: 500 },
		);
	}
}
