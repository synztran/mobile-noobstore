import { restoreOrderStock } from "@/lib/services/orderService";
import { getAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@db-types";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(
	_req: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { id } = await params;
	const supabase = getAdminClient();

	const { data: _data, error } = await supabase
		.from("orders")
		.select(
			`
			id, order_number, status, total_price, shipping_fee,
			voucher_code, voucher_discount_amount, shipping_discount_amount,
			created_at, updated_at, cancelled_at, cancelled_note, paid_at, refunded_at, delivering_at, delivered_at,
			delivery_address, shipping_method_id, expected_delivery_at,
			user_id,
			users(id, first_name, last_name, email, phone_number),
			order_items(id, product_name, quantity, unit_price, thumbnail, order_item_components(id, component_group, variant_name, price_adjustment, product_variant_id, thumbnail, is_pre_order, pre_order_config)),
			order_services(
				id, service_id, service_name, price, quantity, selected_options, customer_note,
				services(base_price)
			)
		`,
		)
		.eq("id", id)
		.single();
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const data = _data as any;

	if (error) {
		return NextResponse.json({ error: error.message }, { status: 404 });
	}

	// Resolve option value labels from selected_options
	type SelectedOptions = Record<
		string,
		{ option_value_id: number; price_adjustment: number }
	>;
	const optionValueIds = (
		data.order_services as unknown as {
			selected_options: SelectedOptions;
		}[]
	)
		.flatMap((svc) =>
			Object.values(svc.selected_options ?? {}).map(
				(v) => v.option_value_id,
			),
		)
		.filter(Boolean);

	let optionValueMap: Record<
		string,
		{ optionLabel: string; valueLabel: string }
	> = {};

	if (optionValueIds.length > 0) {
		const { data: values } = await supabase
			.from("service_option_values")
			.select("id, label, service_options(label)")
			.in("id", optionValueIds);

		for (const v of values ?? []) {
			const optionLabel = Array.isArray(v.service_options)
				? ((v.service_options[0] as { label: string })?.label ?? "")
				: ((v.service_options as { label: string } | null)?.label ??
					"");
			optionValueMap[String(v.id)] = { optionLabel, valueLabel: v.label };
		}
	}

	// Fetch user's default shipping address
	let shippingAddress = null;
	if (data.user_id) {
		const { data: addr } = await supabase
			.from("user_addresses")
			.select(
				"full_name, phone_number, address_line, ward_district, city",
			)
			.eq("user_id", data.user_id)
			.eq("is_default", true)
			.maybeSingle();
		shippingAddress = addr;
	}

	const { data: shippingMethods } = await supabase
		.from("shipping_methods")
		.select("id, name");

	const shippingMethodMap = Object.fromEntries(
		(shippingMethods ?? []).map((method) => [method.id, method.name]),
	);

	return NextResponse.json({
		...data,
		optionValueMap,
		shippingAddress,
		shippingMethodMap,
	});
}

export async function PATCH(
	req: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { id } = await params;
	const body = (await req.json()) as {
		status?: string;
		cancelled_note?: string;
	};

	const VALID_STATUSES = [
		"pending",
		"confirmed",
		"delivering",
		"delivered",
		"cancelled",
		"refunded",
	];
	if (body.status && !VALID_STATUSES.includes(body.status)) {
		return NextResponse.json({ error: "Invalid status" }, { status: 400 });
	}

	type OrderUpdate = Database["public"]["Tables"]["orders"]["Update"];
	const update: OrderUpdate = {};
	if (body.status) update.status = body.status;
	if (body.status === "confirmed") {
		update.paid_at = new Date().toISOString();
	}
	if (body.status === "cancelled") {
		update.cancelled_at = new Date().toISOString();
		update.cancelled_note = body.cancelled_note ?? null;
	}
	if (body.status === "refunded") {
		update.refunded_at = new Date().toISOString();
	}
	if (body.status === "delivering") {
		(update as Record<string, unknown>).delivering_at =
			new Date().toISOString();
	}
	if (body.status === "delivered") {
		(update as Record<string, unknown>).delivered_at =
			new Date().toISOString();
	}

	const supabase = getAdminClient();
	const { error } = await supabase.from("orders").update(update).eq("id", id);
	if (error) {
		return NextResponse.json({ error: error.message }, { status: 500 });
	}

	// Restore stock when order is cancelled or refunded
	if (body.status === "cancelled" || body.status === "refunded") {
		try {
			await restoreOrderStock(id);
		} catch (e) {
			const msg = e instanceof Error ? e.message : "Unknown error";
			console.error(
				`[orderService] Failed to restore stock for order ${id}: ${msg}`,
			);
			// Return a warning but don't roll back — status is already updated
			return NextResponse.json({ success: true, stockWarning: msg });
		}
	}

	return NextResponse.json({ success: true });
}
