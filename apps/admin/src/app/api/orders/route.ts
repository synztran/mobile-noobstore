import { fetchOrdersList } from "@/lib/orders-list-query";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Polling counterpart to the orders page. Both read the same query builder
 * (`fetchOrdersList`), so the first paint and every 30s refresh are guaranteed
 * to return the same columns and apply the same filters.
 */
export async function GET(req: NextRequest) {
	const { searchParams } = req.nextUrl;
	const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));

	const result = await fetchOrdersList({
		q: searchParams.get("q") ?? "",
		by: searchParams.get("by") ?? "order",
		page,
		hideTest: searchParams.get("hideTest") === "1",
	});

	if (!result.ok) {
		return NextResponse.json({ orders: [], count: 0, totalPages: 1 });
	}

	if (result.error) {
		return NextResponse.json({ error: result.error.message }, { status: 500 });
	}

	return NextResponse.json({
		orders: result.orders,
		count: result.count ?? 0,
		totalPages: result.totalPages,
	});
}
