import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export interface SubmitOrderRequestItem {
	product_id: string;
	product_name: string;
	unit_price: number;
	thumbnail?: string | null;
	quantity: number;
	/** For kit items: the resolved component selections */
	components?: Array<{
		variant_id: string;
		variant_name: string;
		component_group: string;
		price_adjustment: number;
		thumbnail: string | null;
	}>;
}

export interface SubmitOrderRequest {
	cart_id: string;
	total_price: number;
	shipping_cost: number;
	items: SubmitOrderRequestItem[];
	service_ids?: string[];
}

export interface SubmitOrderResponse {
	order_id: string;
	order_number: string;
	status: string;
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

		// Get current user (optional — guest checkout allowed)
		const {
			data: { user },
		} = await supabase.auth.getUser();
		// Generate server-side order ID (UUID)
		const orderId = crypto.randomUUID();

		// ── Stock validation + atomic deduction ──────────────────────────────
		const stockItems = body.items.map((i) => ({
			product_id: i.product_id,
			quantity: i.quantity,
			components:
				i.components?.map((c) => ({
					variant_id: c.variant_id,
					quantity: 1,
				})) ?? [],
		}));

		// Cast required: validate_and_deduct_stock is a custom RPC not in the
		// auto-generated database.types.ts (which must not be edited manually).
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const { error: stockError } = (await (
			supabase.rpc as unknown as (
				fn: string,
				args: Record<string, unknown>,
			) => Promise<{ data: unknown; error: { message: string } | null }>
		)("validate_and_deduct_stock", { p_items: stockItems })) as {
			data: unknown;
			error: { message: string } | null;
		};

		if (stockError) {
			return NextResponse.json(
				{ error: stockError.message },
				{ status: 400 },
			);
		}
		// ─────────────────────────────────────────────────────────────────────
		// NOTE: stock has been deducted at this point. All subsequent failures
		// must return 500 so the client can retry; do NOT swallow errors silently.

		// Generate a human-readable order number: ORD-<timestamp36>-<random>
		const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

		// Create the order
		const { data: order, error: orderError } = await supabase
			.from("orders")
			.insert({
				id: orderId,
				user_id: user?.id ?? null,
				order_number: orderNumber,
				status: "pending",
				total_price: body.total_price,
				shipping_fee: body.shipping_cost,
			})
			.select("id, order_number, status, total_price")
			.single();

		if (orderError || !order) {
			// Stock was already deducted — log with high severity so ops can investigate
			console.error(
				"[submit] CRITICAL: stock deducted but order insert failed. order_id:",
				orderId,
				orderError,
			);
			return NextResponse.json(
				{ error: orderError?.message ?? "Could not create order" },
				{ status: 500 },
			);
		}

		// Create order items
		// Generate item IDs server-side
		const orderItemsToInsert = body.items.map((i) => ({
			id: crypto.randomUUID(),
			order_id: order.id,
			product_id: i.product_id,
			product_name: i.product_name,
			unit_price: i.unit_price,
			thumbnail: i.thumbnail ?? null,
			quantity: i.quantity,
		}));

		const { data: insertedItems, error: itemsError } = await supabase
			.from("order_items")
			.insert(orderItemsToInsert)
			.select("id");

		if (itemsError || !insertedItems?.length) {
			console.error("[submit] order_items insert error:", itemsError);
			return NextResponse.json(
				{
					error:
						itemsError?.message ?? "Could not create order items",
				},
				{ status: 500 },
			);
		}

		const orderItems = insertedItems;

		// Save component details for each item
		const orderItemComponents: any[] = [];
		for (let idx = 0; idx < body.items.length; idx++) {
			const item = body.items[idx];
			const orderItem = orderItems[idx];

			if (item.components && item.components.length > 0) {
				for (const comp of item.components) {
					orderItemComponents.push({
						order_item_id: orderItem.id,
						variant_id: comp.variant_id,
						variant_name: comp.variant_name,
						component_group: comp.component_group,
						price_adjustment: comp.price_adjustment,
						thumbnail: comp.thumbnail,
					});
				}
			}
		}

		if (orderItemComponents.length > 0) {
			const { error: compError } = await supabase
				.from("order_item_components")
				.insert(orderItemComponents);

			if (compError) {
				console.error(
					"[submit] order_item_components insert error:",
					compError,
				);
				return NextResponse.json(
					{
						error:
							compError.message ??
							"Could not save order item components",
					},
					{ status: 500 },
				);
			}
		}

		// Attach services if provided
		if (body.service_ids?.length) {
			const { data: services } = await supabase
				.from("services")
				.select("id, base_price")
				.in("id", body.service_ids);

			if (services?.length) {
				const orderServices = services.map((s, idx) => ({
					id: `${order.id}-svc-${idx}`,
					order_id: order.id,
					service_id: s.id,
					price: Number(s.base_price),
				}));
				await supabase.from("order_services").insert(orderServices);
			}
		}

		return NextResponse.json({
			order_id: order.id,
			order_number: order.order_number,
			status: order.status,
		} satisfies SubmitOrderResponse);
	} catch (err: unknown) {
		console.error("[submit] unexpected error:", err);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
