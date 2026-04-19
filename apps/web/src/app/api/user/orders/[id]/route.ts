import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export interface OrderItemDetail {
	id: string;
	product_id: string | null;
	product_name: string;
	unit_price: number;
	quantity: number;
}

export interface OrderDetail {
	id: string;
	order_number: string;
	status: string;
	total_price: number;
	items: OrderItemDetail[];
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
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const { id } = await params;
		if (!id) {
			return NextResponse.json({ error: "Order ID is required" }, { status: 400 });
		}

		const { data: order, error: orderError } = await supabase
			.from("orders")
			.select("id, order_number, status, total_price")
			.eq("id", id)
			.eq("user_id", user.id)
			.single();

		if (orderError || !order) {
			return NextResponse.json({ error: "Order not found" }, { status: 404 });
		}

		const { data: rawItems } = await supabase
			.from("order_items")
			.select("id, product_id, product_name, unit_price, quantity")
			.eq("order_id", id);

		const items: OrderItemDetail[] = (rawItems ?? []).map((row) => ({
			id: row.id,
			product_id: row.product_id,
			product_name: row.product_name,
			unit_price: Number(row.unit_price),
			quantity: row.quantity,
		}));

		return NextResponse.json({
			id: order.id,
			order_number: order.order_number,
			status: order.status,
			total_price: Number(order.total_price),
			items,
		} satisfies OrderDetail);
	} catch (err) {
		console.error("[order detail] unexpected error:", err);
		return NextResponse.json({ error: "Internal server error" }, { status: 500 });
	}
}
