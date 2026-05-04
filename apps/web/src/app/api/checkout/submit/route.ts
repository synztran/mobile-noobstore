import { getAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import { notifyNewOrder } from "@/lib/telegram/telegram.service";
import type { AppliedVoucherSummary } from "@/types/voucher";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export interface SubmitOrderRequestItem {
	product_id: string;
	/** Optional — present for standard products with a selected variant */
	variant_id?: string | null;
	product_name: string;
	thumbnail?: string | null;
	quantity: number;
	/** For kit items: the resolved component selections */
	components?: Array<{
		variant_id: string;
		variant_name: string;
		component_group: string;
		thumbnail: string | null;
	}>;
}

export interface SubmitOrderRequest {
	cart_id: string;
	/** Client-computed shipping cost — capped server-side to prevent manipulation */
	shipping_cost: number;
	items: SubmitOrderRequestItem[];
	service_ids?: string[];
	vouchers?: {
		voucher_id?: string | null;
		voucher_code?: string | null;
		voucher_discount_amount?: number;
		shipping_discount_amount?: number;
		voucher_snapshot?: AppliedVoucherSummary | null;
		gift_items_snapshot?: Array<{
			product_id: string;
			variant_id: string | null;
			quantity: number;
		}> | null;
	}[];
}

export interface SubmitOrderResponse {
	order_id: string;
	order_number: string;
	status: string;
}

function toNumber(value: unknown, fallback = 0): number {
	if (typeof value === "number" && Number.isFinite(value)) {
		return value;
	}

	if (typeof value === "string") {
		const parsed = Number.parseFloat(value);
		return Number.isFinite(parsed) ? parsed : fallback;
	}

	return fallback;
}

function toJson(value: unknown): Json | null {
	if (value === null || typeof value === "undefined") {
		return null;
	}

	return JSON.parse(JSON.stringify(value)) as Json;
}

export async function POST(req: NextRequest) {
	try {
		const body: SubmitOrderRequest = await req.json();

		if (!body.items?.length) {
			return NextResponse.json(
				{ error: "items are required" },
				{ status: 400 },
			);
		}

		const supabase = await createClient();

		const {
			data: { user },
		} = await supabase.auth.getUser();

		// ── Server-side price recalculation ──────────────────────────────────
		// NEVER trust unit_price or total_price from the client.
		// Fetch authoritative prices from the database.

		const productIds = [...new Set(body.items.map((i) => i.product_id))];
		const itemVariantIds = body.items
			.filter((i) => i.variant_id)
			.map((i) => i.variant_id!);
		const componentVariantIds = body.items
			.flatMap((i) => i.components ?? [])
			.map((c) => c.variant_id);
		const allVariantIds = [
			...new Set([...itemVariantIds, ...componentVariantIds]),
		];

		const [
			{ data: productRows, error: productErr },
			{ data: variantRows, error: variantErr },
		] = await Promise.all([
			supabase
				.from("products")
				.select("id, base_price")
				.in("id", productIds),
			allVariantIds.length > 0
				? supabase
						.from("product_variants")
						.select("id, price_adjustment")
						.in("id", allVariantIds)
				: Promise.resolve({
						data: [] as { id: string; price_adjustment: number }[],
						error: null,
					}),
		]);

		if (productErr || variantErr) {
			return NextResponse.json(
				{ error: "Failed to verify product prices" },
				{ status: 500 },
			);
		}

		const productPriceMap = new Map<string, number>(
			(productRows ?? []).map((p) => [p.id, Number(p.base_price)]),
		);
		const variantAdjMap = new Map<string, number>(
			(variantRows ?? []).map((v) => [v.id, Number(v.price_adjustment)]),
		);

		// Build the items payload with server-verified prices
		const rpcItems = body.items.map((i) => {
			const basePrice = productPriceMap.get(i.product_id);
			if (basePrice === undefined) {
				throw new Error(`Product not found: ${i.product_id}`);
			}

			let unitPrice: number;
			if (i.variant_id) {
				// Standard product with a selected variant
				unitPrice = basePrice + (variantAdjMap.get(i.variant_id) ?? 0);
			} else {
				// Kit product: base_price + sum of component price_adjustments from DB
				const compAdj = (i.components ?? []).reduce(
					(sum, c) => sum + (variantAdjMap.get(c.variant_id) ?? 0),
					0,
				);
				unitPrice = basePrice + compAdj;
			}

			return {
				product_id: i.product_id,
				product_name: i.product_name,
				unit_price: unitPrice,
				thumbnail: i.thumbnail ?? null,
				quantity: i.quantity,
				// Each component consumes 1 unit per kit ordered (quantity field)
				components:
					i.components?.map((c) => ({
						variant_id: c.variant_id,
						variant_name: c.variant_name,
						component_group: c.component_group,
						// Server-fetched price_adjustment, not client-supplied
						price_adjustment: variantAdjMap.get(c.variant_id) ?? 0,
						thumbnail: c.thumbnail,
						quantity: 1,
					})) ?? [],
			};
		});

		// Recalculate totals from server-verified item prices.
		// Clamp shipping_cost to a safe ceiling — it is client-computed due to
		// time/district surcharges, but we prevent unreasonable manipulation.
		const MAX_SHIPPING_VND = 500_000;
		const safeShippingCost = Math.min(
			Math.max(0, Number(body.shipping_cost) || 0),
			MAX_SHIPPING_VND,
		);
		const subtotal = rpcItems.reduce(
			(sum, i) => sum + i.unit_price * i.quantity,
			0,
		);

		const vouchers = body.vouchers ?? [];
		const primaryVoucher =
			vouchers.find(
				(v) =>
					Boolean(v.voucher_id) ||
					Boolean(v.voucher_code) ||
					Boolean(v.voucher_snapshot) ||
					Boolean(v.gift_items_snapshot),
			) ?? vouchers[0];
		const requestedVoucherDiscount = vouchers.reduce(
			(sum, v) => sum + toNumber(v.voucher_discount_amount, 0),
			0,
		);
		const requestedShippingDiscount = vouchers.reduce(
			(sum, v) => sum + toNumber(v.shipping_discount_amount, 0),
			0,
		);

		const safeVoucherDiscount = Math.min(
			Math.max(0, requestedVoucherDiscount),
			subtotal,
		);
		const safeShippingDiscount = Math.min(
			Math.max(0, requestedShippingDiscount),
			safeShippingCost,
		);
		const recalculatedTotal = Math.max(
			0,
			subtotal +
				safeShippingCost -
				safeVoucherDiscount -
				safeShippingDiscount,
		);

		// Generate IDs server-side so they're in the response even if the RPC
		// call is retried (idempotent on the same p_order_id).
		const orderId = crypto.randomUUID();
		const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

		// ── Single atomic transaction: lock → validate → deduct → create order ──
		// submit_order uses SELECT … FOR UPDATE to prevent the race condition where
		// two concurrent checkouts both pass stock validation for the last unit.
		const { data, error } = await (
			supabase.rpc as unknown as (
				fn: string,
				args: Record<string, unknown>,
			) => Promise<{ data: unknown; error: { message: string } | null }>
		)("submit_order", {
			p_order_id: orderId,
			p_user_id: user?.id ?? null,
			p_order_number: orderNumber,
			p_total_price: recalculatedTotal,
			p_shipping_cost: safeShippingCost,
			p_items: rpcItems,
		});

		if (error) {
			// RAISE EXCEPTION from the RPC surfaces here — includes OOS messages
			return NextResponse.json({ error: error.message }, { status: 400 });
		}

		const result = data as {
			order_id: string;
			order_number: string;
			status: string;
		};

		// Persist voucher fields on order after atomic submit_order RPC insert.
		if (
			primaryVoucher?.voucher_id ||
			primaryVoucher?.voucher_code ||
			safeVoucherDiscount > 0 ||
			safeShippingDiscount > 0 ||
			primaryVoucher?.voucher_snapshot ||
			primaryVoucher?.gift_items_snapshot
		) {
			const voucherSnapshotJson = toJson(
				primaryVoucher?.voucher_snapshot,
			);
			const giftItemsSnapshotJson = toJson(
				primaryVoucher?.gift_items_snapshot,
			);
			const orderVoucherUpdate = {
				voucher_id: primaryVoucher?.voucher_id ?? null,
				voucher_code: primaryVoucher?.voucher_code ?? null,
				voucher_discount_amount: safeVoucherDiscount,
				shipping_discount_amount: safeShippingDiscount,
				voucher_snapshot: voucherSnapshotJson,
				gift_items_snapshot: giftItemsSnapshotJson,
			};

			const { error: updateOrderError } = await supabase
				.from("orders")
				.update(orderVoucherUpdate)
				.eq("id", result.order_id);

			let voucherPersisted = !updateOrderError;
			if (updateOrderError) {
				const admin = getAdminClient();
				const { error: adminUpdateOrderError } = await admin
					.from("orders")
					.update(orderVoucherUpdate)
					.eq("id", result.order_id);

				if (adminUpdateOrderError) {
					voucherPersisted = false;
					console.error(
						"[submit] failed to persist voucher fields (user+admin):",
						{ updateOrderError, adminUpdateOrderError },
					);
				} else {
					voucherPersisted = true;
				}
			}

			if (voucherPersisted && primaryVoucher?.voucher_id) {
				const admin = getAdminClient();
				const { error: incrementUsageError } = await (
					admin.rpc as unknown as (
						fn: string,
						args: Record<string, unknown>,
					) => Promise<{
						data: unknown;
						error: { message: string } | null;
					}>
				)("increment_voucher_used_count", {
					p_voucher_id: primaryVoucher.voucher_id,
				});

				if (incrementUsageError) {
					console.error(
						"[submit] failed to increment voucher used_count:",
						incrementUsageError,
					);
				}
			}
		}

		// ── Optional: attach services ─────────────────────────────────────────
		if (body.service_ids?.length) {
			const { data: services } = await supabase
				.from("services")
				.select("id, base_price")
				.in("id", body.service_ids);

			if (services?.length) {
				const orderServices = services.map((s, idx) => ({
					id: `${result.order_id}-svc-${idx}`,
					order_id: result.order_id,
					service_id: s.id,
					price: Number(s.base_price),
				}));
				await supabase.from("order_services").insert(orderServices);
			}
		}

		// Fire-and-forget Telegram notification — must not block the response
		const customerName =
			user?.user_metadata?.full_name ?? user?.email ?? "Khách";
		const itemCount = body.items.reduce((sum, i) => sum + i.quantity, 0);
		notifyNewOrder(
			result.order_number,
			customerName,
			recalculatedTotal,
			undefined,
			itemCount,
		).catch(() => {
			// Notification failure must never break the order flow
		});

		return NextResponse.json({
			order_id: result.order_id,
			order_number: result.order_number,
			status: result.status,
		} satisfies SubmitOrderResponse);
	} catch (err: unknown) {
		console.error("[submit] unexpected error:", err);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
