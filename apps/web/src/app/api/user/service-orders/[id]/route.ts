import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export interface ServiceOrderLineDetail {
	id: string;
	service_id: string | null;
	service_name: string | null;
	price: number;
	quantity: number;
	handling_days_snapshot: number;
	customer_note: string | null;
	pickup_at: string | null;
	pickup_note: string | null;
	inbound_tracking_number: string | null;
	received_at: string | null;
	selected_options: { option_value_id: number; price_adjustment: number }[];
	created_at: string;
}

export interface ServiceOrderDetail {
	id: string;
	order_number: string;
	status: string;
	total_price: number;
	cancelled_at: string | null;
	cancelled_note: string | null;
	created_at: string | null;
	lines: ServiceOrderLineDetail[];
}

export async function GET(
	_req: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const supabase = await createClient();
		const {
			data: { user },
		} = await supabase.auth.getUser();

		if (!user) {
			return NextResponse.json(
				{ error: "Unauthorized" },
				{ status: 401 },
			);
		}

		const { id } = await params;
		if (!id) {
			return NextResponse.json(
				{ error: "Order ID is required" },
				{ status: 400 },
			);
		}

		const { data: order, error: orderErr } = await supabase
			.from("orders")
			.select(
				"id, order_number, status, total_price, cancelled_at, cancelled_note, created_at",
			)
			.eq("id", id)
			.eq("user_id", user.id)
			.single();

		if (orderErr || !order) {
			return NextResponse.json(
				{ error: "Order not found" },
				{ status: 404 },
			);
		}

		const { data: lines, error: linesErr } = await supabase
			.from("order_services")
			.select(
				"id, service_id, service_name, price, quantity, handling_days_snapshot, customer_note, pickup_at, pickup_note, inbound_tracking_number, received_at, selected_options, created_at",
			)
			.eq("order_id", id)
			.order("created_at", { ascending: true });

		if (linesErr) {
			return NextResponse.json(
				{ error: "Failed to load service lines" },
				{ status: 500 },
			);
		}

		const result: ServiceOrderDetail = {
			id: order.id,
			order_number: order.order_number,
			status: order.status,
			total_price: order.total_price,
			cancelled_at: order.cancelled_at,
			cancelled_note: order.cancelled_note,
			created_at: order.created_at,
			lines: (lines ?? []).map((l) => ({
				id: l.id,
				service_id: l.service_id,
				service_name: l.service_name,
				price: l.price,
				quantity: l.quantity,
				handling_days_snapshot: l.handling_days_snapshot,
				customer_note: l.customer_note,
				pickup_at: l.pickup_at,
				pickup_note: l.pickup_note,
				inbound_tracking_number: l.inbound_tracking_number,
				received_at: l.received_at,
				selected_options:
					(l.selected_options as ServiceOrderLineDetail["selected_options"]) ??
					[],
				created_at: l.created_at,
			})),
		};

		return NextResponse.json(result);
	} catch {
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
