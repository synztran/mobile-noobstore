import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const { id: identifier } = await params;

		if (!identifier) {
			return NextResponse.json(
				{ error: "Order number is required" },
				{ status: 400 },
			);
		}

		const supabase = await createClient();
		const {
			data: { user },
			error: authError,
		} = await supabase.auth.getUser();

		if (authError || !user) {
			return NextResponse.json(
				{ error: "Unauthorized" },
				{ status: 401 },
			);
		}

			const { data: byOrderNumber, error: byOrderNumberError } =
			await (supabase.from("orders") as any)
				.select(
					"id, order_number, status, voucher_discount_amount, shipping_discount_amount, cancelled_at, cancelled_note, payment_type, deposit_percentage, deposit_amount, remaining_amount, deposit_paid_at, paid_at",
				)
				.eq("user_id", user.id)
				.eq("order_number", identifier)
				.order("created_at", { ascending: false })
				.limit(1);

		if (byOrderNumberError) {
			console.error(
				"[orders by number] query error:",
				byOrderNumberError,
			);
			return NextResponse.json(
				{ error: "Failed to fetch order" },
				{ status: 500 },
			);
		}

		let order = byOrderNumber?.[0] ?? null;

		if (!order) {
			const { data: byId, error: byIdError } = await (supabase
				.from("orders") as any)
				.select(
					"id, order_number, status, voucher_discount_amount, shipping_discount_amount, cancelled_at, cancelled_note, payment_type, deposit_percentage, deposit_amount, remaining_amount, deposit_paid_at, paid_at",
				)
				.eq("user_id", user.id)
				.eq("id", identifier)
				.order("created_at", { ascending: false })
				.limit(1);

			if (byIdError) {
				console.error("[orders by id] query error:", byIdError);
				return NextResponse.json(
					{ error: "Failed to fetch order" },
					{ status: 500 },
				);
			}

			order = byId?.[0] ?? null;
		}

		if (!order) {
			return NextResponse.json(
				{ error: "Order not found" },
				{ status: 404 },
			);
		}

		const mappinStatus = {
			pending: "Đang kiểm tra",
			confirmed: "Đã xác nhận",
			first_paid: "Đã đặt cọc (lần 1)",
			second_paid: "Đã thanh toán đủ",
			preparing: "Đang chuẩn bị hàng",
			delivering: "Đang giao hàng",
			delivered: "Đã giao hàng",
			cancelled: "Đã hủy",
		};

		const o = order as unknown as Record<string, unknown>;
		return NextResponse.json({
			order_id: order.id,
			order_number: order.order_number,
			status:
				mappinStatus[order.status as keyof typeof mappinStatus] ||
				"Trạng thái không xác định",
			cancelled_at:
				(o.cancelled_at as string | null) ?? null,
			cancelled_note:
				(o.cancelled_note as string | null) ?? null,
			voucher_discount_amount: Number(
				o.voucher_discount_amount ?? 0,
			),
			shipping_discount_amount: Number(
				o.shipping_discount_amount ?? 0,
			),
			payment_type: (o.payment_type as "full" | "deposit_cod") ?? "full",
			deposit_percentage: (o.deposit_percentage as number | undefined) ?? null,
			deposit_amount: (o.deposit_amount as number | undefined) ?? null,
			remaining_amount: (o.remaining_amount as number | undefined) ?? null,
			deposit_paid_at: (o.deposit_paid_at as string | null) ?? null,
			paid_at: (o.paid_at as string | null) ?? null,
		});
	} catch (error) {
		console.error("Error fetching order:", error);
		return NextResponse.json(
			{ error: "Failed to fetch order" },
			{ status: 500 },
		);
	}
}
