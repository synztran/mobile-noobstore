import { getQuickPickData } from "@/modules/products/server/ssr";
import { CACHE_KEYS, publicCacheHeaders, readThroughCache } from "@/lib/redis/cache";
import { NextRequest, NextResponse } from "next/server";

export const revalidate = 120;

export async function GET(req: NextRequest) {
	const sp = req.nextUrl.searchParams;

	const categorySlug = sp.get("categorySlug")?.trim() ?? "";
	const productId = sp.get("productId")?.trim() ?? "";
	const brand = sp.get("brand")?.trim() ?? "";
	const excludeProductId = sp.get("excludeProductId")?.trim() ?? "";
	const search = sp.get("search")?.trim() ?? "";
	const limit = sp.get("limit")?.trim() ?? "";
	const sortRaw = sp.get("sort")?.trim() ?? "newest";
	const sort =
		sortRaw === "price_asc" || sortRaw === "price_desc"
			? sortRaw
			: "newest";

	try {
		const data = await readThroughCache(
			CACHE_KEYS.quickPick(
				categorySlug,
				productId,
				search,
				limit,
				sort,
				brand,
				excludeProductId,
			),
			600,
			() =>
				getQuickPickData({
					categorySlug,
					productId: productId || undefined,
					brand,
					excludeProductId,
					search,
					limit: limit ? Number(limit) : undefined,
					sort,
				}),
		);

		return NextResponse.json(data, { headers: publicCacheHeaders() });
	} catch (err) {
		return NextResponse.json(
			{ error: err instanceof Error ? err.message : "Failed to load products" },
			{ status: 500 },
		);
	}
}
