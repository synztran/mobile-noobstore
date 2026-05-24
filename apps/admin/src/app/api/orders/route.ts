import { getAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

export async function GET(req: NextRequest) {
	const { searchParams } = req.nextUrl;
	const q = searchParams.get("q") ?? "";
	const by = searchParams.get("by") ?? "order";
	const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));

	const supabase = getAdminClient();

	let query = supabase
		.from("orders")
		.select(
			"id, order_number, status, total_price, created_at, users(first_name, last_name), order_items(count), order_services(count)",
			{ count: "exact" },
		)
		.order("created_at", { ascending: false })
		.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

	if (q) {
		if (by === "customer") {
			const { data: users } = await supabase
				.from("users")
				.select("id")
				.or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%`);
			const ids = (users ?? []).map((u) => u.id);
			if (ids.length === 0) {
				return NextResponse.json({ orders: [], count: 0 });
			}
			query = query.in("user_id", ids);
		} else {
			query = query.ilike("order_number", `%${q}%`);
		}
	}

	const { data, count, error } = await query;
	if (error) {
		return NextResponse.json({ error: error.message }, { status: 500 });
	}
	return NextResponse.json({ orders: data ?? [], count: count ?? 0 });
}
