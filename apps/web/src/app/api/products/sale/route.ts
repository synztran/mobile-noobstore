import { getSaleProducts } from "@/modules/products/server/sale";
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
	const sort =
		(sp.get("sort") as
			| "discount_desc"
			| "price_asc"
			| "price_desc"
			| "newest"
			| null) ?? "discount_desc";

	const safeLimit = Number.isFinite(limit)
		? Math.min(Math.max(1, Math.floor(limit)), 100)
		: 8;

	try {
		const result = await readThroughCache(
			CACHE_KEYS.saleProducts(categorySlug, safeLimit, sort),
			1800,
			() =>
				getSaleProducts({
					categorySlug,
					limit: safeLimit,
					sort,
					excludeSoldOut: true,
				}),
		);

		return NextResponse.json(result, { headers: publicCacheHeaders() });
	} catch (err) {
		return NextResponse.json(
			{ error: err instanceof Error ? err.message : "Unknown error" },
			{ status: 500 },
		);
	}
}
