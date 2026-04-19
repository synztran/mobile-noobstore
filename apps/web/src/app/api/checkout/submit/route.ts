import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export interface SubmitOrderRequest {
	/** Caller-generated idempotency ID (nanoid) */
	order_id: string;
	total_price: number;
	items: {
		id: string;
		product_id: string;
		product_name: string;
		unit_price: number;
		quantity: number;
	}[];
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

		if (!body.order_id || !body.items?.length) {
			return NextResponse.json(
				{ error: "order_id and items are required" },
				{ status: 400 },
			);
		}

		const supabase = await createClient();

		// Get current user (optional — guest checkout allowed)
		const {
			data: { user },
		} = await supabase.auth.getUser();

		// Generate a human-readable order number: ORD-<timestamp36>-<random>
		const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

		// Create the order
		const { data: order, error: orderError } = await supabase
			.from("orders")
			.insert({
				id: body.order_id,
				user_id: user?.id ?? null,
				order_number: orderNumber,
				status: "pending",
				total_price: body.total_price,
			})
			.select("id, order_number, status")
			.single();

		if (orderError || !order) {
			console.error("[submit] order insert error:", orderError);
			return NextResponse.json(
				{ error: orderError?.message ?? "Could not create order" },
				{ status: 500 },
			);
		}

		// Create order items
		const orderItems = body.items.map((i) => ({
			id: i.id,
			order_id: order.id,
			product_id: i.product_id,
			product_name: i.product_name,
			unit_price: i.unit_price,
			quantity: i.quantity,
		}));

		const { error: itemsError } = await supabase
			.from("order_items")
			.insert(orderItems);

		if (itemsError) {
			console.error("[submit] order_items insert error:", itemsError);
			// Non-fatal — order exists, items can be re-linked
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
