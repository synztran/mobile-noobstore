/**
 * Server-side product data fetching — used by async server components.
 * Mirrors the shaping logic in /api/products/route.ts.
 */

import type { ConfiguratorGroup } from "@/app/api/products/[slug]/configurator/route";
import type { ProductDetail } from "@/app/api/products/[slug]/route";
import type { ShopProduct } from "@/app/api/products/route";
import { getProductListByFilters } from "@/lib/product-query-service";
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
	stock_quantity: number;
};

type RawListRow = {
	id: string;
	slug: string;
	name: string;
	description: string;
	base_price: number;
	stock_quantity: number;
	thumbnail: string | null;
	images: unknown;
	product_type: string;
	is_used: boolean;
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
		stock_quantity: Number(v.stock_quantity ?? 0),
	}));

	const minPrice =
		variants.length > 0
			? Math.min(...variants.map((v) => v.effective_price))
			: Number(p.base_price);

	const productType = (p.product_type ??
		"standard") as ShopProduct["product_type"];
	let effectiveStock: number;
	if (productType === "kit") {
		effectiveStock =
			variants.length > 0
				? Math.min(...variants.map((v) => v.stock_quantity))
				: Number(p.stock_quantity ?? 0);
	} else if (productType === "component") {
		effectiveStock = variants.reduce(
			(sum, variant) => sum + variant.stock_quantity,
			0,
		);
	} else {
		effectiveStock = Number(p.stock_quantity ?? 0);
	}

	const tags: {
		id: number;
		label: string;
		value: string;
		textColor?: string;
		bgColor?: string;
	}[] = [];

	if (effectiveStock === 0) {
		tags.push({
			label: "Hết hàng",
			id: 1,
			value: "sold_out",
		});
	}

	if (p.is_used) {
		tags.push({
			label: "sản phẩm 2nd",
			id: 2,
			value: "used_product",
		});
	}

	return {
		id: p.id,
		slug: p.slug,
		name: p.name,
		category: p.categories?.name ?? "Unknown",
		description: p.description ?? "",
		base_price: Number(p.base_price),
		stock_quantity: effectiveStock,
		thumbnail: p.thumbnail,
		images: Array.isArray(p.images) ? (p.images as string[]) : null,
		product_type: productType,
		variants,
		min_price: minPrice,
		is_used: p.is_used ?? false,
		tags,
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

export interface GetNoteworthyProductsParams {
	categorySlug?: string;
	limit?: number;
}

export interface GetQuickPickDataParams {
	categorySlug?: string;
	productId?: string;
	search?: string;
	limit?: number;
	sort?: "newest" | "price_asc" | "price_desc";
}

export interface QuickPickData {
	products: ShopProduct[];
	configuratorByProductId: Record<string, ConfiguratorGroup[]>;
	activeProduct: ShopProduct | null;
	total: number;
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
		const result = await getProductListByFilters({
			search,
			categorySlug,
			priceMin,
			priceMax,
			sort,
			limit,
			productTypes: ["standard", "kit"],
			excludeUncategorized: true,
		});

		return {
			products: result.products as ShopProduct[],
			total: result.total,
		};
	} catch (err) {
		console.error("[getProducts] Unexpected error:", err);
		return { products: [], total: 0 };
	}
}

/**
 * Product feed for the home Noteworthy section.
 * Uses shared product query logic to keep API and server rendering consistent.
 */
export async function getNoteworthyProducts(
	params: GetNoteworthyProductsParams = {},
): Promise<{ products: ShopProduct[]; total: number }> {
	const { categorySlug = "", limit = 8 } = params;

	try {
		const result = await getProductListByFilters({
			categorySlug,
			limit,
			sort: "newest",
			productTypes: ["standard", "kit"],
			excludeUncategorized: true,
		});

		return {
			products: result.products as ShopProduct[],
			total: result.total,
		};
	} catch (err) {
		console.error("[getNoteworthyProducts] Unexpected error:", err);
		return { products: [], total: 0 };
	}
}

/**
 * Unified QuickPick data loader.
 * Returns product list + all configurator groups needed by QuickPickDrawer
 * in one server call so the client doesn't need to chain product + configurator fetches.
 */
export async function getQuickPickData(
	params: GetQuickPickDataParams = {},
): Promise<QuickPickData> {
	const {
		categorySlug = "",
		productId,
		search = "",
		limit,
		sort = "newest",
	} = params;

	try {
		const shouldFetchProductList = Boolean(categorySlug || search || limit);
		const result = shouldFetchProductList
			? await getProducts({
					categorySlug,
					search,
					limit,
					sort,
				})
			: { products: [] as ShopProduct[], total: 0 };

		const products = [...result.products];
		const productIds = new Set(products.map((p) => p.id));

		let activeProduct: ShopProduct | null = null;
		if (productId) {
			activeProduct = products.find((p) => p.id === productId) ?? null;

			if (!activeProduct) {
				const { data, error } = await getPublicClient()
					.from("products")
					.select(
						`id, slug, name, description, base_price, stock_quantity, thumbnail, images, product_type, is_used,
					 categories(id, name),
					 product_variants(id, variant_name, price_adjustment, thumbnail, stock_quantity)`,
					);

				if (!error && data) {
					activeProduct = shapeRow(data as unknown as RawListRow);
					products.push(activeProduct);
					productIds.add(activeProduct.id);
				}
			}
		}

		const configuratorByProductId: Record<string, ConfiguratorGroup[]> = {};
		const ids = Array.from(productIds);
		if (ids.length > 0) {
			const { data: componentRows, error: componentError } =
				await getPublicClient()
					.from("product_components")
					.select(
						`parent_product_id, component_group, is_required,
						 products!product_components_component_product_id_fkey(
							product_variants(id, variant_name, price_adjustment, thumbnail, stock_quantity)
						 )`,
					)
					.in("parent_product_id", ids)
					.order("component_group");

			if (componentError) {
				console.error(
					"[getQuickPickData] product_components error:",
					componentError.message,
				);
			} else {
				type ComponentRow = {
					parent_product_id: string;
					component_group: string;
					is_required: boolean;
					products?: {
						product_variants?: Array<{
							id: string;
							variant_name: string;
							price_adjustment: number;
							thumbnail: string | null;
							stock_quantity: number;
						}> | null;
					} | null;
				};

				const parentMap = new Map<
					string,
					Map<string, ConfiguratorGroup>
				>();

				for (const row of (componentRows ?? []) as ComponentRow[]) {
					if (!parentMap.has(row.parent_product_id)) {
						parentMap.set(row.parent_product_id, new Map());
					}

					const groups = parentMap.get(row.parent_product_id)!;
					if (!groups.has(row.component_group)) {
						groups.set(row.component_group, {
							component_group: row.component_group,
							is_required: row.is_required,
							variants: [],
						});
					}

					const group = groups.get(row.component_group)!;
					for (const v of row.products?.product_variants ?? []) {
						group.variants.push({
							id: v.id,
							variant_name: v.variant_name,
							price_adjustment: Number(v.price_adjustment),
							thumbnail: v.thumbnail ?? null,
							stock_quantity: Number(v.stock_quantity ?? 0),
						});
					}
				}

				for (const [parentId, groups] of parentMap) {
					configuratorByProductId[parentId] = Array.from(
						groups.values(),
					);
				}
			}
		}

		return {
			products,
			configuratorByProductId,
			activeProduct,
			total: products.length,
		};
	} catch (err) {
		console.error("[getQuickPickData] Unexpected error:", err);
		return {
			products: [],
			configuratorByProductId: {},
			activeProduct: null,
			total: 0,
		};
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
				`id, slug, name, description, base_price, stock_quantity, thumbnail, images, product_type, is_used,
				 product_variants(id, variant_name, price_adjustment, thumbnail, stock_quantity)`,
			)
			.in("product_type", ["standard", "kit"])
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
 * Fetch a product by slug with its selectable component groups for the
 * interactive product detail page.
 *
 * Three-step query:
 *   1. Parent product by slug  (via getProductBySlug)
 *   2. Child products where product_type = 'component', linked via product_components
 *   3. product_variants for each child product (fetched in step 2)
 *
 * Returns { product, componentGroups } ready for ProductView.
 */
export async function getProductDetail(slug: string): Promise<{
	product: ProductDetail;
	componentGroups: ConfiguratorGroup[];
} | null> {
	try {
		// Step 1: Get parent product (reuses existing fetcher)
		const product = await getProductBySlug(slug);
		if (!product) return null;

		const compIds = product.components.map((c) => c.component_product.id);
		if (compIds.length === 0) {
			return { product, componentGroups: [] };
		}

		// Steps 2 & 3: Query child products filtered to product_type = 'component',
		// including their product_variants in the same call.
		type ChildRow = {
			id: string;
			product_variants: Array<{
				id: string;
				variant_name: string;
				price_adjustment: number;
				thumbnail: string | null;
				stock_quantity: number;
			}>;
		};

		const { data: childRows, error } = await getPublicClient()
			.from("products")
			.select(
				`id,
				 product_variants(id, variant_name, price_adjustment, thumbnail, stock_quantity)`,
			)
			.in("id", compIds)
			.eq("product_type", "component");

		if (error) {
			console.error(
				"[getProductDetail] child products error:",
				error.message,
			);
			return { product, componentGroups: [] };
		}

		const childById = new Map<string, ChildRow>(
			((childRows ?? []) as unknown as ChildRow[]).map((r) => [r.id, r]),
		);

		// Group component links by component_group, collecting selectable variants
		// from each matched child product.
		const groupMap = new Map<string, ConfiguratorGroup>();

		for (const comp of product.components) {
			const child = childById.get(comp.component_product.id);
			if (!child) continue; // not a 'component' type product — skip

			if (!groupMap.has(comp.component_group)) {
				groupMap.set(comp.component_group, {
					component_group: comp.component_group,
					is_required: comp.is_required,
					variants: [],
				});
			}

			const group = groupMap.get(comp.component_group)!;
			for (const v of child.product_variants ?? []) {
				group.variants.push({
					id: v.id,
					variant_name: v.variant_name,
					price_adjustment: Number(v.price_adjustment),
					thumbnail: v.thumbnail ?? null,
					stock_quantity: Number(v.stock_quantity ?? 0),
				});
			}
		}

		return {
			product,
			componentGroups: Array.from(groupMap.values()),
		};
	} catch (err) {
		console.error("[getProductDetail] Unexpected error:", err);
		return null;
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
				`id, slug, name, base_price, stock_quantity, category_id, thumbnail, images, product_type, is_used,
				 categories(id, name),
				 product_variants(id, variant_name, price_adjustment, thumbnail, stock_quantity),
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
			stock_quantity: Number(v.stock_quantity ?? 0),
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
					`id, slug, name, base_price, stock_quantity, thumbnail, images, product_type, is_used,
					 categories(id, name),
					 product_variants(id, variant_name, price_adjustment, thumbnail, stock_quantity)`,
				)
				.in("id", compIds);
			if (compData) {
				componentProducts = (compData as unknown as RawListRow[]).map(
					shapeRow,
				);
			}
		}

		// Compute effective stock for kit products from required child component stocks.
		// Mirrors the logic in getProducts().
		const requiredComponentIds = new Set(
			(raw.product_components ?? [])
				.filter((c) => c.is_required)
				.map((c) => c.component_product_id),
		);
		const requiredChildStocks = componentProducts
			.filter((cp) => requiredComponentIds.has(cp.id))
			.map((cp) => cp.stock_quantity);
		const effectiveStock =
			raw.product_type === "kit" && requiredChildStocks.length > 0
				? Math.min(...requiredChildStocks)
				: Number(raw.stock_quantity ?? 0);

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
			stock_quantity: effectiveStock,
			thumbnail: raw.thumbnail,
			images: Array.isArray(raw.images) ? (raw.images as string[]) : null,
			product_type: (raw.product_type ??
				"standard") as ProductDetail["product_type"],
			variants,
			components,
			min_price: minPrice,
			is_used: raw.is_used ?? false,
		};
	} catch (err) {
		console.error("[getProductBySlug] Unexpected error:", err);
		return null;
	}
}
