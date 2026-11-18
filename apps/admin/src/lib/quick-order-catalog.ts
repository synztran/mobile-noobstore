import "server-only";

import { getAdminClient } from "@/lib/supabase/admin";
import type { QuickOrderPricingParent } from "./quick-order";

// Use the same parent lookup for displayed prices and authoritative POST pricing.
export async function loadQuickOrderPricingParents(db: ReturnType<typeof getAdminClient>, productIds: string[]) {
  const parents = new Map<string, QuickOrderPricingParent[]>();
  if (!productIds.length) return { parents, error: null };
  const { data, error } = await db.from("product_components")
    .select("component_product_id, parent:products!product_components_parent_product_id_fkey(id, name, base_price, product_type, is_active)")
    .in("component_product_id", productIds);
  for (const link of data ?? []) {
    const parent = link.parent;
    if (!link.component_product_id || !parent || parent.product_type !== "kit" || !parent.is_active) continue;
    const options = parents.get(link.component_product_id) ?? [];
    if (!options.some((option) => option.id === parent.id)) options.push({ id: parent.id, name: parent.name, base_price: parent.base_price });
    parents.set(link.component_product_id, options);
  }
  return { parents, error };
}
