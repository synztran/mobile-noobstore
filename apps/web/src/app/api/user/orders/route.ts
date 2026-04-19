import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export interface OrderSummary {
	id: string;
	order_number: string;
	status: string;
	total_price: number;
	item_count: number;
}

export interface OrdersResponse {
	orders: OrderSummary[];
	total: number;
}

export async function GET(req: NextRequest) {
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

		const { searchParams } = new URL(req.url);
		const q = searchParams.get("q")?.trim() ?? "";
		const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
		const limit = 20;
		const offset = (page - 1) * limit;

		let query = supabase
			.from("orders")
			.select(
				"id, order_number, status, total_price, order_items(count)",
				{
					count: "exact",
				},
			)
			.eq("user_id", user.id)
			.range(offset, offset + limit - 1);

		if (q) {
			query = query.ilike("order_number", `%${q}%`);
		}

		const { data, error, count } = (await (query as ReturnType<
			typeof query.range
		>)) as unknown as {
			data: Array<{
				id: string;
				order_number: string;
				status: string;
				total_price: number;
				order_items: Array<{ count: number }>;
			}> | null;
			error: { message: string } | null;
			count: number | null;
		};

		if (error) {
			return NextResponse.json({ error: error.message }, { status: 500 });
		}

		const orders: OrderSummary[] = (data ?? []).map((row) => ({
			id: row.id,
			order_number: row.order_number,
			status: row.status,
			total_price: Number(row.total_price),
			item_count: row.order_items?.[0]?.count ?? 0,
		}));

		return NextResponse.json({
			orders,
			total: count ?? 0,
		} satisfies OrdersResponse);
	} catch (err) {
		console.error("[orders] unexpected error:", err);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
