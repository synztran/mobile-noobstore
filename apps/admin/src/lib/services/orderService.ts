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
	if (!bypassStatus.includes(order.status)) return;

	const updates: Promise<void>[] = [];

	// ── 1. Component variants (kit products) ─────────────────────────────
	// Each order_item_components row has product_variant_id = 1 unit consumed
	const { data: itemComponents, error: compErr } = await supabase
		.from("order_item_components")
		.select("product_variant_id")
		.eq("order_id", orderId);

	if (compErr) throw new Error(compErr.message);

	if (itemComponents && itemComponents.length > 0) {
		const variantTotals = new Map<string, number>();
		for (const c of itemComponents) {
			variantTotals.set(
				c.product_variant_id,
				(variantTotals.get(c.product_variant_id) ?? 0) + 1,
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
						.then(
							({
								error,
							}: {
								error: { message: string } | null;
							}) => {
								if (error)
									throw new Error(
										`Failed to restore variant ${v.id}: ${error.message}`,
									);
							},
						),
				),
			);
		}
	}

	// ── 2. Simple products (no components) ───────────────────────────────
	// order_items.product_id → products.stock_quantity (only non-kit products)
	const { data: items, error: itemsErr } = await supabase
		.from("order_items")
		.select("product_id, quantity")
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
			(kitRows ?? []).map((r) => r.parent_product_id),
		);

		const productTotals = new Map<string, number>();
		for (const item of items) {
			if (!item.product_id || kitProductIds.has(item.product_id))
				continue;
			productTotals.set(
				item.product_id,
				(productTotals.get(item.product_id) ?? 0) + item.quantity,
			);
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
							.then(
								({
									error,
								}: {
									error: { message: string } | null;
								}) => {
									if (error)
										throw new Error(
											`Failed to restore product ${p.id}: ${error.message}`,
										);
								},
							),
					),
				);
			}
		}
	}

	await Promise.all(updates);
}
