import { getNoteworthyProducts } from "@/lib/products-server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
	const sp = req.nextUrl.searchParams;
	const categorySlug = sp.get("category")?.trim() ?? "";
	const limit = sp.get("limit") ? Number(sp.get("limit")) : 8;

	const safeLimit = Number.isFinite(limit)
		? Math.min(Math.max(1, Math.floor(limit)), 100)
		: 8;

	try {
		const result = await getNoteworthyProducts({
			categorySlug,
			limit: safeLimit,
		});

		return NextResponse.json(result, {
			headers: {
				"Cache-Control":
					"public, s-maxage=60, stale-while-revalidate=300",
			},
		});
	} catch (err) {
		return NextResponse.json(
			{ error: err instanceof Error ? err.message : "Unknown error" },
			{ status: 500 },
		);
	}
}
