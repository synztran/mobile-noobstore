import "server-only";

import { getAdminClient } from "@/lib/supabase/admin";

export const PRODUCTS_PAGE_SIZE = 20;

export const ALLOWED_PRODUCT_TYPES = new Set([
	"standard",
	"kit",
	"component",
	"gift",
	"all",
]);

/**
 * Shared select for the admin products LIST query. Used by the products
 * server page (first paint) and the `/api/products/list` route (client
 * polls) so the two can no longer drift apart.
 *
 * Columns kept minimal to what ProductCard / ProductsClient actually render
 * (`description` is accepted but unused today — kept for compatibility).
 */
export const PRODUCTS_LIST_SELECT = `
			id, name, slug, base_price, stock_quantity, max_quantity, product_type, brand, description, is_used, thumbnail, attributes, is_active, parent_product_id, category_id, is_pre_order, images, sold_count,
			categories(id, name),
			product_variants(
				id, variant_name, price_adjustment, stock_quantity, is_pre_order, pre_order_config
			),
			product_components!product_components_parent_product_id_fkey(
				id, component_group, is_required, max_quantity,
				component_product:products!product_components_component_product_id_fkey(
					id, name, thumbnail,
					product_variants(id, variant_name, price_adjustment, stock_quantity, is_pre_order, pre_order_config)
				)
			)
		`;

/**
 * Normalizes the `product_type` filter. Only values in ALLOWED_PRODUCT_TYPES
 * are accepted; anything else (including "all") maps to undefined so the
 * query has no type filter — this preserves the previous behavior where a
 * bogus `product_type` param was simply ignored by the `allowedProductTypes`
 * checks on both call sites.
 */
export function normalizeProductTypeFilter(
	productType?: string | null
): string | undefined {
	if (
		!productType ||
		productType === "all" ||
		!ALLOWED_PRODUCT_TYPES.has(productType)
	) {
		return undefined;
	}
	return productType;
}

/**
 * Builds the shared products LIST query (select + order + range). Callers
 * add their own filters (`q`, `product_type`) via the returned query.
 */
export function buildProductsListQuery(
	supabase: ReturnType<typeof getAdminClient>,
	{
		page = 1,
		productType,
	}: { page?: number; productType?: string | null } = {}
) {
	const currentPage = Math.max(1, page);
	const from = (currentPage - 1) * PRODUCTS_PAGE_SIZE;
	const to = from + PRODUCTS_PAGE_SIZE - 1;

	let query = supabase
		.from("products")
		.select(PRODUCTS_LIST_SELECT, { count: "exact" })
		.order("created_at", { ascending: false })
		.range(from, to);

	const selectedType = normalizeProductTypeFilter(productType);
	if (selectedType) {
		query = query.eq("product_type", selectedType);
	}

	return query;
}
