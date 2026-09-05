import "server-only";

import type { Database } from "@/lib/supabase/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { WishlistItemResponse } from "@/modules/user/types";

type Supabase = SupabaseClient<Database>;

export type WishlistListResult =
  | { items: WishlistItemResponse[] }
  | { error: string };

export type WishlistAddResult =
  | { id: string }
  | { error: string; status: 404 | 500 };

export type WishlistRemoveResult = { ok: true } | { error: string };

export async function listWishlist(
  supabase: Supabase,
  userId: string
): Promise<WishlistListResult> {
  const { data, error } = await (
    supabase.from as unknown as (table: string) => {
      select: (columns: string) => {
        eq: (
          column: string,
          value: string
        ) => {
          order: (
            column: string,
            options: { ascending: boolean }
          ) => Promise<{
            data: Array<{
              id: string;
              product_id: string;
              added_at: string;
              products: {
                id: string;
                name: string;
                slug: string;
                base_price: number;
                thumbnail: string | null;
                stock_quantity: number | null;
                brand: string | null;
              } | null;
            }> | null;
            error: { message: string } | null;
          }>;
        };
      };
    }
  )("wishlists")
    .select(
      "id, product_id, added_at, products(id, name, slug, base_price, thumbnail, stock_quantity, brand)"
    )
    .eq("user_id", userId)
    .order("added_at", { ascending: false });

  if (error) {
    return { error: error.message };
  }

  const items: WishlistItemResponse[] = (data ?? []).map((row) => ({
    id: row.id,
    product_id: row.product_id,
    added_at: row.added_at,
    product: row.products
      ? {
          id: row.products.id,
          name: row.products.name,
          slug: row.products.slug,
          base_price: Number(row.products.base_price),
          thumbnail: row.products.thumbnail,
          stock_quantity: row.products.stock_quantity,
          brand: row.products.brand,
        }
      : null,
  }));

  return { items };
}

export async function addWishlistItem(
  supabase: Supabase,
  userId: string,
  productId: string
): Promise<WishlistAddResult> {
  const { data: product, error: productError } = await supabase
    .from("products")
    .select("id")
    .eq("is_active", true)
    .eq("id", productId)
    .maybeSingle();

  if (productError) {
    return { error: productError.message, status: 500 };
  }

  if (!product) {
    return { error: "Product not found", status: 404 };
  }

  const { data, error } = await (
    supabase.from as unknown as (table: string) => {
      upsert: (
        row: { user_id: string; product_id: string },
        options: { onConflict: string; ignoreDuplicates: boolean }
      ) => {
        select: (columns: string) => {
          single: () => Promise<{
            data: { id: string } | null;
            error: { message: string } | null;
          }>;
        };
      };
    }
  )("wishlists")
    .upsert(
      { user_id: userId, product_id: productId },
      { onConflict: "user_id,product_id", ignoreDuplicates: false }
    )
    .select("id")
    .single();

  if (error || !data) {
    return {
      error: error?.message ?? "Failed to add wishlist item",
      status: 500,
    };
  }

  return { id: data.id };
}

export async function removeWishlistItem(
  supabase: Supabase,
  userId: string,
  productId: string
): Promise<WishlistRemoveResult> {
  const { error } = await supabase
    .from("wishlists")
    .delete()
    .eq("user_id", userId)
    .eq("product_id", productId);

  if (error) {
    return { error: error.message };
  }

  return { ok: true };
}
