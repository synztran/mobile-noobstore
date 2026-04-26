import { getPublicClient } from "@/lib/supabase/public";
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

type CategoryRow = { id: string; name: string } | null;
type VariantRow = {
	id: string;
	variant_name: string;
	price_adjustment: number;
	thumbnail: string | null;
	stock_quantity: number;
};

type RawListRow = {
	id: string;
	slug: string;
	name: string;
	base_price: number;
	stock_quantity: number;
	thumbnail: string | null;
	images: unknown;
	product_type: string;
	categories: CategoryRow;
	product_variants: VariantRow[] | null;
};

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
	const productTypes = productTypeParam.split(",").map((t) => t.trim()) as (
		| "standard"
		| "kit"
		| "component"
	)[];

	// Parse and validate numeric parameters
	const priceMin = Math.max(0, Number(sp.get("priceMin") ?? 0) || 0);
	const priceMax = Math.max(0, Number(sp.get("priceMax") ?? 0) || 0);
	const offset = Math.max(0, Number(sp.get("offset") ?? 0) || 0);
	let limit = sp.get("limit") ? Number(sp.get("limit")) : DEFAULT_LIMIT;
	limit = Math.min(Math.max(1, limit), MAX_LIMIT); // Bound: 1-100

	const sort = (sp.get("sort") as SortOption | null) ?? "newest";

	try {
		const supabase = getPublicClient();

		// Resolve category slug → id when provided
		let categoryId: string | null = null;
		if (categorySlug) {
			const { data: catRow } = await supabase
				.from("categories")
				.select("id")
				.eq("slug", categorySlug)
				.maybeSingle();
			if (!catRow) {
				return NextResponse.json<ProductsResponse>({
					products: [],
					total: 0,
				});
			}
			categoryId = (catRow as { id: string }).id;
		}

		// Build optimized Supabase query with DB-level filtering & sorting
		let query = supabase
			.from("products")
			.select(
				`id, slug, name, base_price, stock_quantity, thumbnail, images, product_type,
                 categories(id, name),
                 product_variants(id, variant_name, price_adjustment, thumbnail, stock_quantity)`,
				{ count: "exact" },
			)
			.in("product_type", productTypes);

		// Apply text search filter
		if (search) query = query.ilike("name", `%${search}%`);

		// Apply category filter
		if (categoryId !== null) query = query.eq("category_id", categoryId);

		// Apply price range filter (on base_price; variants handled in JS)
		if (priceMin > 0) query = query.gte("base_price", priceMin);
		if (priceMax > 0) query = query.lte("base_price", priceMax);

		// Apply DB-level sorting before pagination
		if (sort === "price_asc") {
			query = query.order("base_price", { ascending: true });
		} else if (sort === "price_desc") {
			query = query.order("base_price", { ascending: false });
		} else {
			query = query.order("created_at", { ascending: false }); // newest first
		}

		// Apply pagination at DB level
		query = query.range(offset, offset + limit - 1);

		const { data, error, count } = await query;
		if (error) {
			return NextResponse.json({ error: error.message }, { status: 500 });
		}

		// ── Shape raw rows into ShopProduct ──────────────────────────────
		let products = ((data ?? []) as unknown as RawListRow[]).map((p) => {
			const variants = (p.product_variants ?? []).map((v) => ({
				id: v.id,
				variant_name: v.variant_name,
				price_adjustment: Number(v.price_adjustment),
				effective_price:
					Number(p.base_price) + Number(v.price_adjustment),
				thumbnail: v.thumbnail,
				stock_quantity: Number(v.stock_quantity),
			}));

			const minPrice =
				variants.length > 0
					? Math.min(...variants.map((v) => v.effective_price))
					: Number(p.base_price);

			// Compute effective stock_quantity based on product_type:
			// - kit:       MIN of variant stocks (bottleneck component limits the kit)
			// - component: SUM of variant stocks (total sellable units across all options)
			// - standard:  use product-level stock_quantity directly
			const productType = (p.product_type ??
				"standard") as ShopProduct["product_type"];
			let effectiveStock: number;
			if (productType === "kit") {
				effectiveStock =
					variants.length > 0
						? Math.min(...variants.map((v) => v.stock_quantity))
						: Number(p.stock_quantity);
			} else if (productType === "component") {
				effectiveStock = variants.reduce(
					(sum, v) => sum + v.stock_quantity,
					0,
				);
			} else {
				effectiveStock = p.stock_quantity;
			}

			return {
				id: p.id,
				slug: p.slug,
				name: p.name,
				category: p.categories?.name ?? "Unknown",
				base_price: Number(p.base_price),
				stock_quantity: effectiveStock,
				thumbnail: p.thumbnail,
				images: Array.isArray(p.images) ? (p.images as string[]) : null,
				product_type: productType,
				variants,
				min_price: minPrice,
				tags: [],
			} satisfies ShopProduct;
		});

		// Return paginated results with accurate total count
		return NextResponse.json<ProductsResponse>(
			{
				products,
				total: count ?? 0,
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
