import { getPublicClient } from "@/lib/supabase/public";

export type ProductSortOption = "newest" | "price_asc" | "price_desc";
export type ProductType = "standard" | "kit" | "component";

export interface ProductTag {
	id: number;
	label: string;
	value: string;
	icon?: string;
	textColor?: string;
	bgColor?: string;
}

export interface ProductVariant {
	id: string;
	variant_name: string;
	price_adjustment: number;
	effective_price: number;
	thumbnail: string | null;
	stock_quantity: number;
}

export interface ProductListItem {
	id: string;
	slug: string;
	name: string;
	category: string;
	base_price: number;
	stock_quantity: number;
	thumbnail: string | null;
	images: string[] | null;
	product_type: ProductType;
	variants: ProductVariant[];
	min_price: number;
	tags: ProductTag[];
}

type CategoryRow = { id: string } | null;
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
	categories: { id: string; name: string } | null;
	product_variants: VariantRow[] | null;
};

type ComponentLink = {
	parent_product_id: string;
	component_product_id: string;
	is_required: boolean;
};

type ComponentRow = {
	id: string;
	product_variants?: Array<{
		stock_quantity?: number;
	}> | null;
};

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

function getTags(product: ProductListItem): ProductTag[] {
	if (product.stock_quantity === 0) {
		return [
			{
				label: "Hết hàng",
				id: 1,
				value: "sold_out",
				textColor: "text-white",
				bgColor: "bg-red-400",
			},
		];
	}

	return [];
}

function shapeRow(row: RawListRow): ProductListItem {
	const variants = (row.product_variants ?? []).map((variant) => ({
		id: variant.id,
		variant_name: variant.variant_name,
		price_adjustment: Number(variant.price_adjustment),
		effective_price:
			Number(row.base_price) + Number(variant.price_adjustment),
		thumbnail: variant.thumbnail,
		stock_quantity: Number(variant.stock_quantity ?? 0),
	}));

	const minPrice =
		variants.length > 0
			? Math.min(...variants.map((variant) => variant.effective_price))
			: Number(row.base_price);

	const productType = (row.product_type ?? "standard") as ProductType;
	let effectiveStock = Number(row.stock_quantity ?? 0);

	if (productType === "kit") {
		effectiveStock =
			variants.length > 0
				? Math.min(...variants.map((variant) => variant.stock_quantity))
				: Number(row.stock_quantity ?? 0);
	} else if (productType === "component") {
		effectiveStock = variants.reduce(
			(sum, variant) => sum + variant.stock_quantity,
			0,
		);
	}

	const shaped: ProductListItem = {
		id: row.id,
		slug: row.slug,
		name: row.name,
		category: row.categories?.name ?? "Unknown",
		base_price: Number(row.base_price),
		stock_quantity: effectiveStock,
		thumbnail: row.thumbnail,
		images: Array.isArray(row.images) ? (row.images as string[]) : null,
		product_type: productType,
		variants,
		min_price: minPrice,
		tags: [],
	};

	shaped.tags = getTags(shaped);
	return shaped;
}

async function computeKitStockById(
	kitIds: string[],
): Promise<Map<string, number>> {
	const supabase = getPublicClient();
	const result = new Map<string, number>();

	if (kitIds.length === 0) return result;

	const { data: componentLinks, error: linkError } = await supabase
		.from("product_components")
		.select("parent_product_id, component_product_id, is_required")
		.in("parent_product_id", kitIds)
		.eq("is_required", true);

	if (linkError) return result;

	const links = (componentLinks ?? []) as ComponentLink[];
	const componentProductIds = Array.from(
		new Set(links.map((link) => link.component_product_id)),
	);

	if (componentProductIds.length === 0) return result;

	const { data: componentRows, error: componentRowsError } = await supabase
		.from("products")
		.select("id, product_variants(stock_quantity)")
		.in("id", componentProductIds);

	if (componentRowsError) return result;

	const componentStockById = new Map<string, number>();
	for (const row of (componentRows ?? []) as ComponentRow[]) {
		const stock = (row.product_variants ?? []).reduce(
			(sum, variant) => sum + Number(variant.stock_quantity ?? 0),
			0,
		);
		componentStockById.set(row.id, stock);
	}

	const childrenByParent = new Map<string, string[]>();
	for (const link of links) {
		const childIds = childrenByParent.get(link.parent_product_id) ?? [];
		childIds.push(link.component_product_id);
		childrenByParent.set(link.parent_product_id, childIds);
	}

	for (const [parentId, childIds] of childrenByParent) {
		const childStocks = childIds.map(
			(childId) => componentStockById.get(childId) ?? 0,
		);
		result.set(
			parentId,
			childStocks.length > 0 ? Math.min(...childStocks) : 0,
		);
	}

	return result;
}

export interface GetProductListParams {
	search?: string;
	categorySlug?: string;
	priceMin?: number;
	priceMax?: number;
	sort?: ProductSortOption;
	limit?: number;
	offset?: number;
	productTypes?: ProductType[];
	excludeUncategorized?: boolean;
}

export async function getProductListByFilters(
	params: GetProductListParams = {},
): Promise<{ products: ProductListItem[]; total: number }> {
	const {
		search = "",
		categorySlug = "",
		priceMin = 0,
		priceMax = 0,
		sort = "newest",
		limit,
		offset = 0,
		productTypes = ["standard", "kit", "component"],
		excludeUncategorized = false,
	} = params;

	const safeSearch = search.trim().slice(0, 100);
	const safeCategorySlug = categorySlug.trim().slice(0, 100);
	const safePriceMin = Math.max(0, Number(priceMin) || 0);
	const safePriceMax = Math.max(0, Number(priceMax) || 0);
	const safeOffset = Math.max(0, Number(offset) || 0);
	const safeLimit =
		typeof limit === "number"
			? Math.min(Math.max(1, Math.floor(limit)), MAX_LIMIT)
			: DEFAULT_LIMIT;

	try {
		const supabase = getPublicClient();

		let categoryId: string | null = null;
		if (safeCategorySlug) {
			const { data: catRow } = await supabase
				.from("categories")
				.select("id")
				.eq("slug", safeCategorySlug)
				.maybeSingle();

			if (!catRow) return { products: [], total: 0 };
			categoryId = (catRow as CategoryRow)?.id ?? null;
		}

		let query = supabase
			.from("products")
			.select(
				`id, slug, name, base_price, stock_quantity, thumbnail, images, product_type,
				 categories(id, name),
				 product_variants(id, variant_name, price_adjustment, thumbnail, stock_quantity)`,
			)
			.in("product_type", productTypes);

		if (excludeUncategorized) query = query.not("category_id", "is", null);
		if (safeSearch) query = query.ilike("name", `%${safeSearch}%`);
		if (categoryId !== null) query = query.eq("category_id", categoryId);

		const { data, error } = await query;
		if (error) return { products: [], total: 0 };

		const rows = (data ?? []) as unknown as RawListRow[];
		const kitIds = rows
			.filter((row) => row.product_type === "kit")
			.map((row) => row.id);

		const kitStockById = await computeKitStockById(kitIds);

		let filteredProducts = rows.map((row) => {
			const shaped = shapeRow(row);
			if (row.product_type === "kit") {
				const stock = kitStockById.get(row.id);
				if (typeof stock === "number") {
					shaped.stock_quantity = stock;
					shaped.tags = getTags(shaped);
				}
			}
			return shaped;
		});

		if (safePriceMin > 0 || safePriceMax > 0) {
			filteredProducts = filteredProducts.filter(
				(product) =>
					product.min_price >= safePriceMin &&
					(safePriceMax === 0 || product.min_price <= safePriceMax),
			);
		}

		if (sort === "price_asc") {
			filteredProducts.sort((a, b) => a.min_price - b.min_price);
		} else if (sort === "price_desc") {
			filteredProducts.sort((a, b) => b.min_price - a.min_price);
		} else {
			filteredProducts.sort((a, b) => b.id.localeCompare(a.id));
		}

		const total = filteredProducts.length;
		const pagedProducts = filteredProducts.slice(
			safeOffset,
			safeOffset + safeLimit,
		);

		return { products: pagedProducts, total };
	} catch {
		return { products: [], total: 0 };
	}
}
