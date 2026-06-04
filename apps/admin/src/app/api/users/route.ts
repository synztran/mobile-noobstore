import { getAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
	const supabase = getAdminClient();
	const search = req.nextUrl.searchParams.get("search") ?? "";
	const limit = Number(req.nextUrl.searchParams.get("limit")) || 20;

	let query = supabase
		.from("users")
		.select("id, email, first_name, last_name")
		.order("email", { ascending: true })
		.limit(limit);

	if (search.trim()) {
		query = query.ilike("email", `%${search.trim()}%`);
	}

	const { data, error } = await query;

	if (error) return NextResponse.json({ error: error.message }, { status: 500 });
	return NextResponse.json(data);
}
