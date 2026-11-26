import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
const INVOICE_EXCLUDED_STATUSES = ["cancelled"] as const;
const PAGE_SIZE = 20;

export async function GET(request: NextRequest) {
	const requestedPage = Number(request.nextUrl.searchParams.get("page") ?? "1");
	const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
	const from = (page - 1) * PAGE_SIZE;
	const supabase = getAdminClient();
	const { data, count, error } = await supabase
		.from("orders")
		.select("id, order_number, created_at, total_price, status, invoice_url", { count: "exact" })
		.not("invoice_url", "is", null)
		.not("status", "in", `(${INVOICE_EXCLUDED_STATUSES.map((status) => `"${status}"`).join(",")})`)
		.order("created_at", { ascending: false })
		.range(from, from + PAGE_SIZE - 1);

	if (error) {
		console.error("[invoices] list failed", error);
		return NextResponse.json({ error: "Unable to load invoices" }, { status: 500 });
	}
	return NextResponse.json({ invoices: data ?? [], page, pageSize: PAGE_SIZE, total: count ?? 0 });
}
