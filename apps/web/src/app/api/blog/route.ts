import { getBlogList } from "@/lib/blog-server";
import {
	CACHE_KEYS,
	publicCacheHeaders,
	readThroughCache,
} from "@/lib/redis/cache";
import { NextRequest, NextResponse } from "next/server";

export const revalidate = 300;

export async function GET(req: NextRequest) {
	const sp = req.nextUrl.searchParams;
	const category = sp.get("category")?.trim() ?? "";
	const page = Math.max(1, parseInt(sp.get("page") ?? "1", 10) || 1);
	const limit = Math.min(
		50,
		Math.max(1, parseInt(sp.get("limit") ?? "12", 10) || 12),
	);

	try {
		const result = await readThroughCache(
			CACHE_KEYS.blogList(category, page, limit),
			300,
			() => getBlogList(category, page, limit),
		);

		return NextResponse.json(result, { headers: publicCacheHeaders() });
	} catch (err) {
		return NextResponse.json(
			{ error: err instanceof Error ? err.message : "Failed to load posts" },
			{ status: 500 },
		);
	}
}