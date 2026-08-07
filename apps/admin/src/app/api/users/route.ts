import { getAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
	const supabase = getAdminClient();
	const search = req.nextUrl.searchParams.get("search") ?? "";
	const limit = Number(req.nextUrl.searchParams.get("limit")) || 20;
	const idsParam = req.nextUrl.searchParams.get("ids") ?? "";

	const ids = idsParam
		.split(",")
		.map((id) => id.trim())
		.filter(Boolean);

	let query = supabase
		.from("users")
		.select("id, email, first_name, last_name")
		.order("email", { ascending: true })
		.limit(limit);

	if (search.trim()) {
		query = query.ilike("email", `%${search.trim()}%`);
	}
	if (ids.length > 0) {
		query = query.in("id", ids);
	}

	const { data, error } = await query;

	if (error) return NextResponse.json({ error: error.message }, { status: 500 });
	return NextResponse.json(data);
}
