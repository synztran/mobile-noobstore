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

		const {
			data: { user },
		} = await supabase.auth.getUser();

		// Generate IDs server-side so they're in the response even if the RPC
		// call is retried (idempotent on the same p_order_id).
		const orderId = crypto.randomUUID();
		const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

		// Build the items payload — combines stock-deduction data with order data
		const rpcItems = body.items.map((i) => ({
			product_id: i.product_id,
			product_name: i.product_name,
			unit_price: i.unit_price,
			thumbnail: i.thumbnail ?? null,
			quantity: i.quantity,
			// Each component consumes 1 unit per kit ordered (quantity field)
			components:
				i.components?.map((c) => ({
					variant_id: c.variant_id,
					variant_name: c.variant_name,
					component_group: c.component_group,
					price_adjustment: c.price_adjustment,
					thumbnail: c.thumbnail,
					quantity: 1,
				})) ?? [],
		}));

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
			p_total_price: body.total_price,
			p_shipping_cost: body.shipping_cost,
			p_items: rpcItems,
		});

		if (error) {
			// RAISE EXCEPTION from the RPC surfaces here — includes OOS messages
			return NextResponse.json({ error: error.message }, { status: 400 });
		}

		const result = data as { order_id: string; order_number: string; status: string };

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
