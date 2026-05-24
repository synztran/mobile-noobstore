import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ServiceOrderItem {
	service_id: string;
	quantity: number;
	/** IDs from service_option_values — used for server-side price lookup */
	selected_option_value_ids: number[];
	customer_note?: string | null;
	inbound_tracking_number?: string | null;
}

export interface ServiceOrderRequest {
	items: ServiceOrderItem[];
}

export interface ServiceOrderResponse {
	order_id: string;
	order_number: string;
	status: string;
}

// ─── POST /api/service-orders ─────────────────────────────────────────────────
// DEPRECATED: Compatibility endpoint during migration to /api/service-bookings.
// New frontend flows should call /api/service-bookings only.
// Creates a standalone service order (no physical product items).
// Requires authentication. Recalculates all prices server-side.

export async function POST(req: NextRequest) {
	const supabase = await createClient();

	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const body: ServiceOrderRequest = await req.json();

	if (!body.items?.length) {
		return NextResponse.json(
			{ error: "items are required" },
			{ status: 400 },
		);
	}

	const serviceIds = [...new Set(body.items.map((i) => i.service_id))];
	const allOptionValueIds = body.items.flatMap(
		(i) => i.selected_option_value_ids,
	);

	// ── Server-side price recalculation ──────────────────────────────────────
	// Fetch authoritative base prices and option adjustments from the DB.
	const [
		{ data: serviceRows, error: svcErr },
		{ data: optionValueRows, error: ovErr },
	] = await Promise.all([
		supabase
			.from("services")
			.select("id, name, base_price")
			.in("id", serviceIds)
			.eq("is_active", true),
		allOptionValueIds.length > 0
			? supabase
					.from("service_option_values")
					.select("id, price_adjustment")
					.in("id", allOptionValueIds)
			: Promise.resolve({
					data: [] as { id: number; price_adjustment: number }[],
					error: null,
				}),
	]);

	if (svcErr || ovErr) {
		return NextResponse.json(
			{ error: "Failed to verify service prices" },
			{ status: 500 },
		);
	}

	const servicePriceMap = new Map((serviceRows ?? []).map((s) => [s.id, s]));
	const optionAdjMap = new Map(
		(optionValueRows ?? []).map((v) => [v.id, v.price_adjustment]),
	);

	// ── Build verified line items ─────────────────────────────────────────────
	let totalPrice = 0;

	const lineItems = body.items.map((item) => {
		const svc = servicePriceMap.get(item.service_id);
		if (!svc) {
			throw new Error(
				`Service not found or inactive: ${item.service_id}`,
			);
		}

		const optionsAdj = item.selected_option_value_ids.reduce(
			(sum, id) => sum + (optionAdjMap.get(id) ?? 0),
			0,
		);
		const unitPrice = Number(svc.base_price) + optionsAdj;
		const lineTotal = unitPrice * item.quantity;
		totalPrice += lineTotal;

		const selectedOptionsSnapshot = item.selected_option_value_ids.map(
			(id) => ({
				option_value_id: id,
				price_adjustment: optionAdjMap.get(id) ?? 0,
			}),
		);

		return {
			service_id: item.service_id,
			service_name: svc.name,
			price: unitPrice,
			quantity: item.quantity,
			selected_options: selectedOptionsSnapshot,
			customer_note: item.customer_note ?? null,
			inbound_tracking_number: item.inbound_tracking_number ?? null,
		};
	});

	// ── Insert orders row ─────────────────────────────────────────────────────
	const orderId = crypto.randomUUID();
	const orderNumber = `SVC-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

	const { error: orderErr } = await supabase.from("orders").insert({
		id: orderId,
		order_number: orderNumber,
		user_id: user.id,
		total_price: totalPrice,
		shipping_fee: 0,
		status: "pending",
	});

	if (orderErr) {
		return NextResponse.json({ error: orderErr.message }, { status: 500 });
	}

	// ── Insert order_services rows ────────────────────────────────────────────
	const { error: itemsErr } = await supabase.from("order_services").insert(
		lineItems.map((item) => ({
			id: crypto.randomUUID(),
			order_id: orderId,
			...item,
		})),
	);

	if (itemsErr) {
		// Best-effort rollback — cancel the dangling order
		await supabase
			.from("orders")
			.update({
				status: "cancelled",
				cancelled_note: "Service items insert failed",
			})
			.eq("id", orderId);

		return NextResponse.json({ error: itemsErr.message }, { status: 500 });
	}

	const response: ServiceOrderResponse = {
		order_id: orderId,
		order_number: orderNumber,
		status: "pending",
	};

	return NextResponse.json(response, { status: 201 });
}
