import { getPublicClient } from "@/lib/supabase/public";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// ─── Public Types ────────────────────────────────────────────────────────────

export type SortOption = "newest" | "price_asc" | "price_desc";

export interface ShopVariant {
	id: string;
	variant_name: string;
	price_adjustment: number;
	effective_price: number;
	thumbnail: string | null;
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
	variants: ShopVariant[];
	min_price: number;
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
};

type RawListRow = {
	id: string;
	slug: string;
	name: string;
	base_price: number;
	stock_quantity: number;
	thumbnail: string | null;
	images: unknown;
	categories: CategoryRow;
	product_variants: VariantRow[] | null;
};

// ─── GET /api/products ────────────────────────────────────────────────────────
//
// Query params:
//   search    — full-text search on name
//   category  — category slug (exact match)
//   priceMin  — minimum price              default 0
//   priceMax  — maximum price              default 0 (no filter when 0)
//   sort      — "newest" | "price_asc" | "price_desc"    default "newest"
//   limit     — max results to return
//
// Response:
//   { products: ShopProduct[], total: number }

export async function GET(req: NextRequest) {
	const sp = req.nextUrl.searchParams;

	const search = sp.get("search")?.trim() ?? "";
	const categorySlug = sp.get("category")?.trim() ?? "";
	const priceMin = Number(sp.get("priceMin") ?? 0);
	const priceMax = Number(sp.get("priceMax") ?? 0);
	const sort = (sp.get("sort") as SortOption | null) ?? "newest";
	const limit = sp.get("limit") ? Number(sp.get("limit")) : null;

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

		// Build base query
		let query = supabase.from("products").select(
			`id, slug, name, base_price, stock_quantity, thumbnail, images,
			 categories(id, name),
			 product_variants(id, variant_name, price_adjustment, thumbnail)`,
		);

		if (search) query = query.ilike("name", `%${search}%`);
		if (categoryId !== null) query = query.eq("category_id", categoryId);

		const { data, error } = await query;
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
			}));

			const minPrice =
				variants.length > 0
					? Math.min(...variants.map((v) => v.effective_price))
					: Number(p.base_price);

			return {
				id: p.id,
				slug: p.slug,
				name: p.name,
				category: p.categories?.name ?? "Unknown",
				base_price: Number(p.base_price),
				stock_quantity: p.stock_quantity,
				thumbnail: p.thumbnail,
				images: Array.isArray(p.images) ? (p.images as string[]) : null,
				variants,
				min_price: minPrice,
			} satisfies ShopProduct;
		});

		// ── JS-level price filter ─────────────────────────────────────────
		if (priceMin > 0 || priceMax > 0) {
			products = products.filter(
				(p) =>
					p.min_price >= priceMin &&
					(priceMax === 0 || p.min_price <= priceMax),
			);
		}

		// ── JS-level sort ────────────────────────────────────────────────
		if (sort === "price_asc") {
			products.sort((a, b) => a.min_price - b.min_price);
		} else if (sort === "price_desc") {
			products.sort((a, b) => b.min_price - a.min_price);
		}

		const sliced = limit && limit > 0 ? products.slice(0, limit) : products;

		return NextResponse.json<ProductsResponse>({
			products: sliced,
			total: sliced.length,
		});
	} catch (err) {
		return NextResponse.json(
			{ error: err instanceof Error ? err.message : "Unknown error" },
			{ status: 500 },
		);
	}
}
