import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
	const sp = req.nextUrl.searchParams;
	const category = sp.get("category")?.trim() ?? "";
	const page = Math.max(1, parseInt(sp.get("page") ?? "1", 10) || 1);
	const limit = Math.min(50, Math.max(1, parseInt(sp.get("limit") ?? "12", 10) || 12));

	try {
		const supabase = await createClient();

		let query = supabase
			.from("blog_posts")
			.select("*", { count: "exact", head: false })
			.eq("published", true)
			.order("published_at", { ascending: false })
			.order("created_at", { ascending: false });

		if (category) {
			query = query.ilike("category", `%${category}%`);
		}

		const from = (page - 1) * limit;
		const to = from + limit - 1;
		query = query.range(from, to);

		const { data, error, count } = await query;

		if (error) throw error;

		return NextResponse.json({
			data,
			count,
			page,
			limit,
			totalPages: Math.ceil((count ?? 0) / limit),
		});
	} catch (err) {
		return NextResponse.json(
			{ error: err instanceof Error ? err.message : "Unknown error" },
			{ status: 500 }
		);
	}
}
