import ProductsClient from "@/components/products/ProductsClient";
import ProductsHeader from "@/components/products/ProductsHeader";
import type { ProductCardProps } from "@/components/products/ProductCard";
import { isInStock } from "@/lib/product-utils";
import {
  buildProductsListQuery,
  PRODUCTS_PAGE_SIZE,
} from "@/lib/products-list-query";
import { getAdminClient } from "@/lib/supabase/admin";

export const metadata = {
  title: "Products - NoobStore Admin",
};

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
  const currentPage = Math.max(1, parseInt(page ?? "1", 10));

  const supabase = getAdminClient();

  let query = buildProductsListQuery(supabase, {
    page: currentPage,
    productType: product_type,
  });

  if (q) {
    query = query.ilike("name", `%${q}%`);
  }

  const { data: rows, error, count } = await query;

  const excludeSoldOut = exclude_sold_out === "true";
  let products = (rows ?? []) as ProductCardProps["product"][];
  if (excludeSoldOut) {
    products = products.filter((p) => isInStock(p));
  }

  const totalPages = Math.max(
    1,
    Math.ceil((excludeSoldOut ? products.length : (count ?? 0)) / PRODUCTS_PAGE_SIZE)
  );
  const { data: categories } = await supabase.from("categories").select("id, name");

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
