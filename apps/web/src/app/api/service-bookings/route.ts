import { createClient } from "@/lib/supabase/server";
import { randomBase36 } from "@/lib/random";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ServiceBookingSelection {
	service_id: string;
	quantity: number;
	selected_option_value_ids: number[];
	line_note?: string;
}

export interface ServiceBookingRequest {
	pickup_at?: string;
	pickup_note?: string;
	customer_note?: string;
	selections: ServiceBookingSelection[];
}

export interface ServiceBookingResponse {
	order_id: string;
	order_number: string;
	status: "pending";
}

// ─── POST /api/service-bookings ──────────────────────────────────────────────
// Creates one service booking order with multiple service lines.
// Requires authentication and validates pricing server-side.

export async function POST(req: NextRequest) {
	const supabase = await createClient();

	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const body: ServiceBookingRequest = await req.json();

	if (!body.selections?.length) {
		return NextResponse.json(
			{ error: "selections are required" },
			{ status: 400 },
		);
	}

	if (body.pickup_at) {
		const pickupAtTs = Date.parse(body.pickup_at);
		if (Number.isNaN(pickupAtTs)) {
			return NextResponse.json(
				{ error: "pickup_at must be a valid ISO datetime" },
				{ status: 400 },
			);
		}

		if (pickupAtTs < Date.now()) {
			return NextResponse.json(
				{ error: "pickup_at cannot be in the past" },
				{ status: 400 },
			);
		}
	}

	const pickupAtTs = body.pickup_at ? Date.parse(body.pickup_at) : null;

	const invalidQuantity = body.selections.some((s) => s.quantity < 1);
	if (invalidQuantity) {
		return NextResponse.json(
			{ error: "quantity must be at least 1" },
			{ status: 400 },
		);
	}

	const serviceIds = [...new Set(body.selections.map((s) => s.service_id))];
	const allOptionValueIds = [
		...new Set(body.selections.flatMap((s) => s.selected_option_value_ids)),
	];

	const [
		{ data: serviceRows, error: serviceErr },
		{ data: optionValueRows, error: optionErr },
	] = await Promise.all([
		supabase
			.from("services")
			.select(
				"id, name, base_price, handling_days, is_active, service_section, is_bookable_on_services_page, service_configs(id, base_price, handling_days, is_active)",
			)
			.in("id", serviceIds),
		allOptionValueIds.length > 0
			? supabase
					.from("service_option_values")
					.select("id, option_id, price_adjustment")
					.in("id", allOptionValueIds)
			: Promise.resolve({
					data: [] as {
						id: number;
						option_id: number;
						price_adjustment: number;
					}[],
					error: null,
				}),
	]);

	if (serviceErr || optionErr) {
		return NextResponse.json(
			{ error: "Failed to verify booking prices" },
			{ status: 500 },
		);
	}

	const bookableServices = (serviceRows ?? []).filter(
		(svc) =>
			svc.is_active &&
			svc.is_bookable_on_services_page &&
			svc.service_section !== "middleman",
	);

	if (bookableServices.length !== serviceIds.length) {
		return NextResponse.json(
			{ error: "One or more selected services are invalid" },
			{ status: 400 },
		);
	}

	if (
		optionValueRows &&
		optionValueRows.length !== allOptionValueIds.length
	) {
		return NextResponse.json(
			{ error: "One or more selected option values are invalid" },
			{ status: 400 },
		);
	}

	const serviceMap = new Map(bookableServices.map((svc) => [svc.id, svc]));
	const optionAdjMap = new Map(
		(optionValueRows ?? []).map((opt) => [opt.id, opt.price_adjustment]),
	);

	let totalPrice = 0;

	const lineItems = body.selections.map((selection) => {
		const svc = serviceMap.get(selection.service_id);
		if (!svc) {
			throw new Error("Invalid service selection");
		}

		let optionsAdj = 0;
		for (const optionId of selection.selected_option_value_ids) {
			const adj = optionAdjMap.get(optionId);
			if (adj === undefined) {
				throw new Error("Invalid option selection");
			}
			optionsAdj += adj;
		}

		const config = (svc.service_configs ?? []).find(
			(c) => c.is_active,
		);
		const unitPrice =
			(config?.base_price ?? Number(svc.base_price)) + optionsAdj;
		const lineTotal = unitPrice * selection.quantity;
		totalPrice += lineTotal;

		const selectedOptions = selection.selected_option_value_ids.map(
			(id) => ({
				option_value_id: id,
				price_adjustment: optionAdjMap.get(id) ?? 0,
			}),
		);

		return {
			service_id: selection.service_id,
			service_name: svc.name,
			price: unitPrice,
			quantity: selection.quantity,
			selected_options: selectedOptions,
			customer_note: selection.line_note ?? body.customer_note ?? null,
			pickup_at: pickupAtTs ? new Date(pickupAtTs).toISOString() : null,
			pickup_note: body.pickup_note ?? null,
			handling_days_snapshot:
				config?.handling_days ?? svc.handling_days,
		};
	});

	const orderId = crypto.randomUUID();
	const orderNumber = `SVC-${Date.now().toString(36).toUpperCase()}-${randomBase36(4)}`;

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

	const { error: itemsErr } = await supabase.from("order_services").insert(
		lineItems.map((item) => ({
			id: crypto.randomUUID(),
			order_id: orderId,
			...item,
		})),
	);

	if (itemsErr) {
		await supabase
			.from("orders")
			.update({
				status: "cancelled",
				cancelled_note: "Service booking insert failed",
			})
			.eq("id", orderId);

		return NextResponse.json({ error: itemsErr.message }, { status: 500 });
	}

	const response: ServiceBookingResponse = {
		order_id: orderId,
		order_number: orderNumber,
		status: "pending",
	};

	return NextResponse.json(response, { status: 201 });
}
