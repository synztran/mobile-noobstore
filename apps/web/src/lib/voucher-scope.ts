import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

type ScopeDb = SupabaseClient<Database>;

/**
 * Resolve the owning product for a set of variants. Kit items store the
 * parent product_id on the cart line, but each selected component variant
 * belongs to a different product — voucher scope matching must account for
 * those owning products.
 */
export async function resolveVariantOwners(
  db: ScopeDb,
  variantIds: string[],
): Promise<Map<string, string>> {
  const unique = [...new Set(variantIds.filter(Boolean))];
  const owners = new Map<string, string>();
  if (unique.length === 0) return owners;

  const { data } = await db
    .from("product_variants")
    .select("id, product_id")
    .in("id", unique);

  for (const row of data ?? []) {
    if (row.id && row.product_id) owners.set(row.id, row.product_id);
  }
  return owners;
}

/**
 * Resolve the category slug for a set of products (null when unmapped).
 */
export async function resolveCategorySlugByProductId(
  db: ScopeDb,
  productIds: string[],
): Promise<Map<string, string | null>> {
  const unique = [...new Set(productIds.filter(Boolean))];
  const result = new Map<string, string | null>();
  if (unique.length === 0) return result;
  for (const id of unique) result.set(id, null);

  const { data: categoryRows } = await db.from("categories").select("id, slug");
  const slugById = new Map(
    (categoryRows ?? []).map((c) => [c.id, c.slug]),
  );

  const { data: productRows } = await db
    .from("products")
    .select("id, category_id")
    .in("id", unique);

  for (const p of productRows ?? []) {
    if (p.category_id) {
      const slug = slugById.get(p.category_id);
      if (slug) result.set(p.id, slug);
    }
  }
  return result;
}