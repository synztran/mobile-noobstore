import { getAdminClient } from "@/lib/supabase/admin";

/**
 * Restores stock quantities for all order items.
 * Called when an order is cancelled or refunded.
 * Guards against double-restore when going cancelled → refunded.
 *
 * Schema (updated):
 *   order_items           — product_id, quantity (no variant_id)
 *   order_item_components — order_id, product_variant_id (linked to orders, not items)
 *   product_components    — parent_product_id, component_product_id (kit definition)
 */
export async function restoreOrderStock(orderId: string): Promise<void> {
  const supabase = getAdminClient();

  // Guard: read current status before the update is applied
  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .select("status, paid_at")
    .eq("id", orderId)
    .single();

  if (orderErr) throw new Error(orderErr.message);

  // If already cancelled without payment (going to refunded), stock was already restored — skip
  // if (!order.paid_at && order.status === "cancelled") return;
  const bypassStatus = ["cancelled", "refunded"];
  if (bypassStatus.includes(order.status)) return;

  const updates: Promise<void>[] = [];

  // ── 1. Component variants (kit products) ─────────────────────────────
  // submit_order deducts parent_qty × comp_qty per component variant and stores
  // one order_item_components row per variant carrying its per-unit quantity.
  // Restore the same amount: parent item quantity × component quantity.
  const { data: itemComponents, error: compErr } = await supabase
    .from("order_item_components")
    .select("product_variant_id, order_item_id, quantity")
    .eq("order_id", orderId);

  if (compErr) throw new Error(compErr.message);

  if (itemComponents && itemComponents.length > 0) {
    const orderItemIds = [
      ...new Set(
        itemComponents
          .map((c) => c.order_item_id)
          .filter((id): id is string => Boolean(id))
      ),
    ];

    const parentQtyMap = new Map<string, number>();
    if (orderItemIds.length > 0) {
      const { data: parentItems, error: parentErr } = await supabase
        .from("order_items")
        .select("id, quantity")
        .in("id", orderItemIds);

      if (parentErr) throw new Error(parentErr.message);

      for (const pi of parentItems ?? []) {
        parentQtyMap.set(pi.id, pi.quantity ?? 1);
      }
    }

    const variantTotals = new Map<string, number>();
    for (const c of itemComponents) {
      const parentQty = c.order_item_id
        ? (parentQtyMap.get(c.order_item_id) ?? 1)
        : 1;
      const compQty = c.quantity ?? 1;
      variantTotals.set(
        c.product_variant_id,
        (variantTotals.get(c.product_variant_id) ?? 0) +
          parentQty * compQty
      );
    }

    const { data: variants, error: varErr } = await supabase
      .from("product_variants")
      .select("id, stock_quantity")
      .in("id", Array.from(variantTotals.keys()));

    if (varErr) throw new Error(varErr.message);

    for (const v of variants ?? []) {
      const restore = variantTotals.get(v.id) ?? 0;
      const newQty = (v.stock_quantity ?? 0) + restore;
      updates.push(
        Promise.resolve(
          supabase
            .from("product_variants")
            .update({ stock_quantity: newQty })
            .eq("id", v.id)
            .then(({ error }: { error: { message: string } | null }) => {
              if (error)
                throw new Error(
                  `Failed to restore variant ${v.id}: ${error.message}`
                );
            })
        )
      );
    }
  }

  // ── 2. Simple products (no components) ───────────────────────────────
  // Mirror of submit_order Phase 2: a line that debited its variant row must
  // credit that same row (order_items.variant_id); the product row is only
  // credited when variant_id is NULL. Kits never debit their product row.
  const { data: items, error: itemsErr } = await supabase
    .from("order_items")
    .select("product_id, quantity, variant_id")
    .eq("order_id", orderId)
    .not("product_id", "is", null);

  if (itemsErr) throw new Error(itemsErr.message);

  if (items && items.length > 0) {
    const productIds = items.map((i) => i.product_id as string);

    // Identify which product_ids are kits (have product_components rows)
    const { data: kitRows, error: kitErr } = await supabase
      .from("product_components")
      .select("parent_product_id")
      .in("parent_product_id", productIds);

    if (kitErr) throw new Error(kitErr.message);

    const kitProductIds = new Set(
      (kitRows ?? []).map((r) => r.parent_product_id)
    );

    const variantTotals2 = new Map<string, number>();
    const productTotals = new Map<string, number>();
    for (const item of items) {
      if (!item.product_id || kitProductIds.has(item.product_id)) continue;
      if (item.variant_id) {
        variantTotals2.set(
          item.variant_id,
          (variantTotals2.get(item.variant_id) ?? 0) + item.quantity
        );
      } else {
        productTotals.set(
          item.product_id,
          (productTotals.get(item.product_id) ?? 0) + item.quantity
        );
      }
    }

    if (variantTotals2.size > 0) {
      const { data: variants, error: varErr } = await supabase
        .from("product_variants")
        .select("id, stock_quantity")
        .in("id", Array.from(variantTotals2.keys()));

      if (varErr) throw new Error(varErr.message);

      for (const v of variants ?? []) {
        const restore = variantTotals2.get(v.id) ?? 0;
        const newQty = (v.stock_quantity ?? 0) + restore;
        updates.push(
          Promise.resolve(
            supabase
              .from("product_variants")
              .update({ stock_quantity: newQty })
              .eq("id", v.id)
              .then(({ error }: { error: { message: string } | null }) => {
                if (error)
                  throw new Error(
                    `Failed to restore variant ${v.id}: ${error.message}`
                  );
              })
          )
        );
      }
    }

    if (productTotals.size > 0) {
      const { data: products, error: prodErr } = await supabase
        .from("products")
        .select("id, stock_quantity")
        .in("id", Array.from(productTotals.keys()));

      if (prodErr) throw new Error(prodErr.message);

      for (const p of products ?? []) {
        const restore = productTotals.get(p.id) ?? 0;
        const newQty = (p.stock_quantity ?? 0) + restore;
        updates.push(
          Promise.resolve(
            supabase
              .from("products")
              .update({ stock_quantity: newQty })
              .eq("id", p.id)
              .then(({ error }: { error: { message: string } | null }) => {
                if (error)
                  throw new Error(
                    `Failed to restore product ${p.id}: ${error.message}`
                  );
              })
          )
        );
      }
    }
  }

  await Promise.all(updates);
}
