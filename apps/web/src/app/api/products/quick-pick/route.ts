import { getQuickPickData } from "@/lib/products-server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
	const sp = req.nextUrl.searchParams;

	const categorySlug = sp.get("categorySlug")?.trim() ?? "";
	const productId = sp.get("productId")?.trim() ?? "";
	const search = sp.get("search")?.trim() ?? "";
	const limit = sp.get("limit") ? Number(sp.get("limit")) : undefined;
	const sortRaw = sp.get("sort")?.trim() ?? "newest";
	const sort =
		sortRaw === "price_asc" || sortRaw === "price_desc"
			? sortRaw
			: "newest";

	const data = await getQuickPickData({
		categorySlug,
		productId: productId || undefined,
		search,
		limit,
		sort,
	});

	return NextResponse.json(data);
}
