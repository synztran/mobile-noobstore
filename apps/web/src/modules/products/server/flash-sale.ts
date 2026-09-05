import "server-only";

import { getPublicClient } from "@/lib/supabase/public";

export interface FlashSaleProduct {
  id: string;
  slug: string;
  name: string;
  thumbnail: string | null;
  base_price: number;
  min_price: number;
  stock_quantity: number | null;
  sale_ends_at: string;
}

export async function getFlashSaleProducts(): Promise<FlashSaleProduct[]> {
  const supabase = getPublicClient();

  const { data } = await supabase
    .from("products")
    .select(
      "id, slug, name, thumbnail, base_price, stock_quantity, sale_ends_at, product_variants(price_adjustment)"
    )
    .eq("is_active", true)
    .in("product_type", ["standard", "kit"])
    .not("sale_ends_at", "is", null)
    .gt("sale_ends_at", new Date().toISOString())
    .order("sale_ends_at", { ascending: true })
    .limit(10);

  if (!data) return [];

  return data.map((raw) => {
    const row = raw as Record<string, unknown>;
    const variants = (row.product_variants ?? []) as Array<{
      price_adjustment: number;
    }>;
    const basePrice = Number(row.base_price);
    const minPrice =
      variants.length > 0
        ? Math.min(
            basePrice,
            ...variants.map((v) => basePrice + Number(v.price_adjustment))
          )
        : basePrice;
    return {
      id: row.id as string,
      slug: row.slug as string,
      name: row.name as string,
      thumbnail: (row.thumbnail as string | null) ?? null,
      base_price: basePrice,
      min_price: minPrice,
      stock_quantity:
        typeof row.stock_quantity === "number" ? row.stock_quantity : null,
      sale_ends_at: row.sale_ends_at as string,
    };
  });
}

export async function getSoonestFlashSale(): Promise<FlashSaleProduct | null> {
  const products = await getFlashSaleProducts();
  return products[0] ?? null;
}
