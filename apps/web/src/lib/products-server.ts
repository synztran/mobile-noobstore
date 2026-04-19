/**
 * Server-side product data fetching — used by async server components.
 * Mirrors the shaping logic in /api/products/route.ts.
 */

import type { ProductDetail } from "@/app/api/products/[slug]/route";
import type { ShopProduct } from "@/app/api/products/route";
import { getPublicClient } from "@/lib/supabase/public";

export type { ProductDetail };

export type CategoryItem = {
	id: string;
	name: string;
	slug: string;
	thumbnail: string | null;
};

/**
 * Fetch all categories for use in server components.
 */
export async function getCategories(): Promise<CategoryItem[]> {
	try {
		const { data, error } = await getPublicClient()
			.from("categories")
			.select("id, name, slug, thumbnail")
			.order("name");
		if (error) {
			console.error("[getCategories] Supabase error:", error.message);
			return [];
		}
		return (data ?? []) as CategoryItem[];
	} catch (err) {
		console.error("[getCategories] Unexpected error:", err);
		return [];
	}
}

// ─── Internal row types ───────────────────────────────────────────────────────

type RawVariantRow = {
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
	categories: { id: string; name: string } | null;
	product_variants: RawVariantRow[] | null;
};

// ─── Shared shaping logic ─────────────────────────────────────────────────────

function shapeRow(p: RawListRow): ShopProduct {
	const variants = (p.product_variants ?? []).map((v) => ({
		id: v.id,
		variant_name: v.variant_name,
		price_adjustment: Number(v.price_adjustment),
		effective_price: Number(p.base_price) + Number(v.price_adjustment),
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
	};
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface GetProductsParams {
	search?: string;
	categorySlug?: string;
	priceMin?: number;
	priceMax?: number;
	sort?: "newest" | "price_asc" | "price_desc";
	limit?: number;
}

/**
 * Flexible product query for server components (shop page, search, etc.)
 */
export async function getProducts(
	params: GetProductsParams = {},
): Promise<{ products: ShopProduct[]; total: number }> {
	const {
		search = "",
		categorySlug = "",
		priceMin = 0,
		priceMax = 0,
		sort = "newest",
		limit,
	} = params;

	try {
		const supabase = getPublicClient();

		// Resolve category slug → id
		let categoryId: string | null = null;
		if (categorySlug) {
			const { data: catRow } = await supabase
				.from("categories")
				.select("id")
				.eq("slug", categorySlug)
				.maybeSingle();
			if (!catRow) return { products: [], total: 0 };
			categoryId = (catRow as { id: string }).id;
		}

		let query = supabase
			.from("products")
			.select(
				`id, slug, name, base_price, stock_quantity, thumbnail, images,
			 categories(id, name),
			 product_variants(id, variant_name, price_adjustment, thumbnail)`,
			)
			.not("category_id", "is", null);

		if (search) query = query.ilike("name", `%${search}%`);
		if (categoryId !== null) query = query.eq("category_id", categoryId);

		const { data, error } = await query;
		if (error) {
			console.error("[getProducts] Supabase error:", error.message);
			return { products: [], total: 0 };
		}

		let products = ((data ?? []) as unknown as RawListRow[]).map(shapeRow);

		// JS-level price filter
		if (priceMin > 0 || priceMax > 0) {
			products = products.filter(
				(p) =>
					p.min_price >= priceMin &&
					(priceMax === 0 || p.min_price <= priceMax),
			);
		}

		if (sort === "price_asc")
			products.sort((a, b) => a.min_price - b.min_price);
		else if (sort === "price_desc")
			products.sort((a, b) => b.min_price - a.min_price);

		const sliced = limit && limit > 0 ? products.slice(0, limit) : products;
		return { products: sliced, total: sliced.length };
	} catch (err) {
		console.error("[getProducts] Unexpected error:", err);
		return { products: [], total: 0 };
	}
}

/**
 * Fetch the N newest products for use in server components.
 */
export async function getNewestProducts(limit: number): Promise<ShopProduct[]> {
	try {
		const { data, error } = await getPublicClient()
			.from("products")
			.select(
				`id, slug, name, base_price, stock_quantity, thumbnail, images,
				 categories(id, name),
				 product_variants(id, variant_name, price_adjustment, thumbnail)`,
			)
			.limit(limit);

		if (error) {
			console.error("[getNewestProducts] Supabase error:", error.message);
			return [];
		}
		if (!data) return [];
		return (data as unknown as RawListRow[]).map(shapeRow);
	} catch (err) {
		console.error("[getNewestProducts] Unexpected error:", err);
		return [];
	}
}

/**
 * Fetch a single product by slug for the product detail page.
 */
export async function getProductBySlug(
	slug: string,
): Promise<ProductDetail | null> {
	try {
		const { data: product, error } = await getPublicClient()
			.from("products")
			.select(
				`id, slug, name, base_price, stock_quantity, category_id, thumbnail, images,
				 categories(id, name),
				 product_variants(id, variant_name, price_adjustment, thumbnail),
				 product_components!product_components_parent_product_id_fkey(
				 	id, component_group, is_required, component_product_id
				 )`,
			)
			.eq("slug", slug)
			.maybeSingle();

		if (error || !product) return null;

		type RawComponentRow = {
			id: string;
			component_group: string;
			is_required: boolean;
			component_product_id: string;
		};

		const raw = product as unknown as RawListRow & {
			category_id: string | null;
			product_components: RawComponentRow[] | null;
		};

		const variants = (raw.product_variants ?? []).map((v) => ({
			id: v.id,
			variant_name: v.variant_name,
			price_adjustment: Number(v.price_adjustment),
			effective_price:
				Number(raw.base_price) + Number(v.price_adjustment),
			thumbnail: v.thumbnail,
		}));

		const minPrice =
			variants.length > 0
				? Math.min(...variants.map((v) => v.effective_price))
				: Number(raw.base_price);

		const compIds = (raw.product_components ?? []).map(
			(c) => c.component_product_id,
		);

		let componentProducts: ShopProduct[] = [];
		if (compIds.length > 0) {
			const { data: compData } = await getPublicClient()
				.from("products")
				.select(
					`id, slug, name, base_price, stock_quantity, thumbnail, images,
					 categories(id, name),
					 product_variants(id, variant_name, price_adjustment, thumbnail)`,
				)
				.in("id", compIds);
			if (compData) {
				componentProducts = (compData as unknown as RawListRow[]).map(
					shapeRow,
				);
			}
		}

		const components = (raw.product_components ?? []).map((c) => {
			const cp = componentProducts.find(
				(p) => p.id === c.component_product_id,
			);
			return {
				id: c.id,
				component_group: c.component_group,
				is_required: c.is_required,
				component_product: cp
					? {
							id: cp.id,
							name: cp.name,
							slug: cp.slug,
							base_price: cp.base_price,
							thumbnail: cp.thumbnail,
							images: cp.images,
							variants: cp.variants,
						}
					: {
							id: c.component_product_id,
							name: "Unknown",
							slug: "",
							base_price: 0,
							thumbnail: null,
							images: null,
							variants: [],
						},
			};
		});

		return {
			id: raw.id,
			slug: raw.slug,
			name: raw.name,
			category: raw.categories?.name ?? "Unknown",
			category_id: raw.category_id,
			base_price: Number(raw.base_price),
			stock_quantity: raw.stock_quantity,
			thumbnail: raw.thumbnail,
			images: Array.isArray(raw.images) ? (raw.images as string[]) : null,
			variants,
			components,
			min_price: minPrice,
		};
	} catch (err) {
		console.error("[getProductBySlug] Unexpected error:", err);
		return null;
	}
}
