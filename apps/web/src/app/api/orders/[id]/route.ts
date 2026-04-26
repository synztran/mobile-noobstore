import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const { id } = await params;

		if (!id) {
			return NextResponse.json(
				{ error: "Order number is required" },
				{ status: 400 },
			);
		}

		const supabase = await createClient();

		// Fetch order details
		const { data: order, error } = await supabase
			.from("orders")
			.select("id, order_number, status")
			.eq("order_number", id)
			.single();

		if (error || !order) {
			return NextResponse.json(
				{ error: "Order not found" },
				{ status: 404 },
			);
		}

		const mappinStatus = {
			pending: "Đang chờ xác nhận",
			confirmed: "Đã xác nhận",
			preparing: "Đang chuẩn bị hàng",
			delivering: "Đang giao hàng",
			delivered: "Đã giao hàng",
			cancelled: "Đã hủy",
		};

		return NextResponse.json({
			order_id: order.id,
			order_number: order.order_number,
			status:
				mappinStatus[order.status as keyof typeof mappinStatus] ||
				"Trạng thái không xác định",
		});
	} catch (error) {
		console.error("Error fetching order:", error);
		return NextResponse.json(
			{ error: "Failed to fetch order" },
			{ status: 500 },
		);
	}
}
