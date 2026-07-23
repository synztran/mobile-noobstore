import ProductsClient from "@/components/products/ProductsClient";
import ProductsHeader from "@/components/products/ProductsHeader";
import type { ProductCardProps } from "@/components/products/ProductCard";
import { isInStock } from "@/lib/product-utils";
import { getAdminClient } from "@/lib/supabase/admin";

export const metadata = {
  title: "Products - NoobStore Admin",
};

const PAGE_SIZE = 20;

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    page?: string;
    product_type?: string;
    exclude_sold_out?: string;
  }>;
}) {
  const { q, page, product_type, exclude_sold_out } = await searchParams;
  const allowedProductTypes = new Set([
    "standard",
    "kit",
    "component",
    "gift",
    "all",
  ]);
  const selectedProductType =
    allowedProductTypes.has(product_type ?? "all") && product_type !== "all"
      ? product_type
      : undefined;
  const currentPage = Math.max(1, parseInt(page ?? "1", 10));
  const from = (currentPage - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const supabase = getAdminClient();

  let query = supabase
    .from("products")
    .select(
      `
			id, name, slug, base_price, stock_quantity, product_type, brand, description, is_used, thumbnail, attributes, is_active, parent_product_id, is_pre_order,
			categories(id, name),
			product_variants(
				id, variant_name, price_adjustment, stock_quantity, is_pre_order, pre_order_config
			),
			product_components!product_components_parent_product_id_fkey(
				id, component_group, is_required, max_quantity,
				component_product:products!product_components_component_product_id_fkey(
					id, name, thumbnail,
					product_variants(
						id, variant_name, price_adjustment, stock_quantity, is_pre_order, pre_order_config
					)
				)
			)
		`,
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  let categoryQuery = supabase.from("categories").select("id, name");

  if (q) {
    query = query.ilike("name", `%${q}%`);
  }

  if (selectedProductType) {
    query = query.eq("product_type", selectedProductType);
  }

  const { data: rows, error, count } = await query;

  const excludeSoldOut = exclude_sold_out === "true";
  let products = (rows ?? []) as ProductCardProps["product"][];
  if (excludeSoldOut) {
    products = products.filter((p) => isInStock(p));
  }

  const totalPages = Math.max(
    1,
    Math.ceil((excludeSoldOut ? products.length : (count ?? 0)) / PAGE_SIZE)
  );
  const { data: categories } = await categoryQuery;

  if (error) {
    console.error("Error fetching products:", error);
  }

  return (
    <div className="space-y-6">
      <ProductsHeader categories={categories} />

      {error && (
        <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Failed to load products.
        </div>
      )}

      <ProductsClient
        initialProducts={products}
        initialCount={excludeSoldOut ? products.length : (count ?? 0)}
        initialTotalPages={totalPages}
      />
    </div>
  );
}
