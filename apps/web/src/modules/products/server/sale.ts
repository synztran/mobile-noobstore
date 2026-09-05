import "server-only";

import type { ShopProduct } from "@/modules/products/types";
import { getProductListByFilters } from "./queries";
import { getPublicClient } from "@/lib/supabase/public";

export interface GetSaleProductsParams {
  categorySlug?: string;
  limit?: number;
  sort?: "discount_desc" | "price_asc" | "price_desc" | "newest";
  excludeSoldOut?: boolean;
}

/**
 * Fetch products that are currently on sale (have discount variants)
 */
export async function getSaleProducts(
  params: GetSaleProductsParams = {}
): Promise<{ products: ShopProduct[]; total: number }> {
  const { categorySlug = "", limit = 8, sort = "discount_desc", excludeSoldOut = false } = params;

  try {
    // First, get all products to filter for sale items
    const { products: allProducts, total } = await getProductListByFilters({
      categorySlug,
      limit: 30,
      sort: "newest",
      productTypes: ["standard", "kit"],
      excludeUncategorized: true
    });

    // Filter products that have discount variants (min_price < base_price)
    let saleProducts = allProducts.filter((product) => {
      // Check if any variant has a negative price adjustment (discount)
      const hasDiscountVariant = product.variants.some(
        (variant) => variant.price_adjustment < 0
      );
      // Also check if min_price is less than base_price (alternative check)
      const hasPriceDiscount = product.min_price < product.base_price;
      return hasDiscountVariant || hasPriceDiscount;
    });

    if (excludeSoldOut) {
      saleProducts = saleProducts.filter((p) => p.stock_quantity > 0);
    }

    // Apply sorting
    let sortedProducts = [...saleProducts];
    switch (sort) {
      case "discount_desc":
        // Sort by highest discount percentage
        sortedProducts.sort((a, b) => {
          const discountA = a.variants.find((v) => v.price_adjustment < 0);
          const discountB = b.variants.find((v) => v.price_adjustment < 0);
          const discountPercentA =
            discountA && a.base_price > 0
              ? Math.abs(discountA.price_adjustment) / a.base_price
              : 0;
          const discountPercentB =
            discountB && b.base_price > 0
              ? Math.abs(discountB.price_adjustment) / b.base_price
              : 0;
          return discountPercentB - discountPercentA;
        });
        break;
      case "price_asc":
        sortedProducts.sort((a, b) => a.min_price - b.min_price);
        break;
      case "price_desc":
        sortedProducts.sort((a, b) => b.min_price - a.min_price);
        break;
      case "newest":
        sortedProducts.sort((a, b) => b.id.localeCompare(a.id));
        break;
    }

    // Apply limit
    const limitedProducts = sortedProducts.slice(0, limit);

    return {
      products: limitedProducts,
      total: saleProducts.length,
    };
  } catch (err) {
    console.error("[getSaleProducts] Unexpected error:", err);
    return { products: [], total: 0 };
  }
}
