import {
	getProductListByFilters,
	type ProductSortOption,
	type ProductType,
} from "@/lib/product-query-service";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// ─── Cache & Performance Settings ───────────────────────────────────────────
const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 20;

// ─── Public Types ────────────────────────────────────────────────────────────

export type SortOption = "newest" | "price_asc" | "price_desc";

export interface ShopVariant {
	id: string;
	variant_name: string;
	price_adjustment: number;
	effective_price: number;
	thumbnail: string | null;
	stock_quantity: number;
}

export interface ITag {
	id: number;
	label: string;
	value: string;
	icon?: string;
	textColor?: string;
	bgColor?: string;
}

export interface ShopProduct {
	id: string;
	slug: string;
	name: string;
	category: string;
	base_price: number;
	stock_quantity: number;
	thumbnail: string | null;
	images: string[] | null;
	product_type: "standard" | "kit" | "component";
	variants: ShopVariant[];
	min_price: number;
	tags: ITag[];
}

export interface ProductsResponse {
	products: ShopProduct[];
	total: number;
}

// ─── Internal row types ───────────────────────────────────────────────────────

// ─── GET /api/products ────────────────────────────────────────────────────────
//
// Query params:
//   search       — full-text search on name (max 100 chars)
//   category     — category slug (exact match, max 100 chars)
//   productType  — comma-separated: "standard,kit,component" (default: all)
//   priceMin     — minimum price (default 0)
//   priceMax     — maximum price (default 0 = no upper limit)
//   sort         — "newest" | "price_asc" | "price_desc" (default: "newest")
//   offset       — pagination offset (default 0)
//   limit        — results per page (default 20, max 100)
//
// Response:
//   { products: ShopProduct[], total: number }
//
// Optimizations:
//   ✓ DB-level filtering (search, price, category)
//   ✓ DB-level sorting before pagination
//   ✓ Pagination via range() to avoid fetching excess records
//   ✓ Exact count() for total
//   ✓ Cache headers (60s CDN, 300s stale-while-revalidate)
//   ✓ Input validation & bounds checking

export async function GET(req: NextRequest) {
	const sp = req.nextUrl.searchParams;

	// Validate and sanitize input parameters
	const search = sp.get("search")?.trim().slice(0, 100) ?? "";
	const categorySlug = sp.get("category")?.trim().slice(0, 100) ?? "";
	const productTypeParam =
		sp.get("productType")?.trim() ?? "standard,kit,component";
	const productTypes = productTypeParam
		.split(",")
		.map((t) => t.trim())
		.filter(
			(t): t is ProductType =>
				t === "standard" || t === "kit" || t === "component",
		);

	// Parse and validate numeric parameters
	const priceMin = Math.max(0, Number(sp.get("priceMin") ?? 0) || 0);
	const priceMax = Math.max(0, Number(sp.get("priceMax") ?? 0) || 0);
	const offset = Math.max(0, Number(sp.get("offset") ?? 0) || 0);
	let limit = sp.get("limit") ? Number(sp.get("limit")) : DEFAULT_LIMIT;
	limit = Math.min(Math.max(1, limit), MAX_LIMIT); // Bound: 1-100

	const sort = (sp.get("sort") as ProductSortOption | null) ?? "newest";

	try {
		const { products, total } = await getProductListByFilters({
			search,
			categorySlug,
			priceMin,
			priceMax,
			sort,
			limit,
			offset,
			productTypes:
				productTypes.length > 0
					? productTypes
					: (["standard", "kit", "component"] as ProductType[]),
		});

		// Return paginated results with accurate total count
		return NextResponse.json<ProductsResponse>(
			{
				products: products as ShopProduct[],
				total,
			},
			{
				headers: {
					"Cache-Control":
						"public, s-maxage=60, stale-while-revalidate=300",
				},
			},
		);
	} catch (err) {
		return NextResponse.json(
			{ error: err instanceof Error ? err.message : "Unknown error" },
			{ status: 500 },
		);
	}
}
