import { getAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface ReviewRow {
	id: string;
	product_id: string;
	user_id: string;
	rating: number;
	title: string | null;
	body: string | null;
	reviewer_name: string;
	is_visible: boolean;
	reply: string | null;
	created_at: string;
	products: { name: string; slug: string } | null;
}

export async function GET(req: NextRequest) {
	try {
		const sp = req.nextUrl.searchParams;
		const page = Math.max(1, Number(sp.get("page")) || 1);
		const limit = Math.min(50, Math.max(1, Number(sp.get("limit")) || 20));
		const offset = (page - 1) * limit;
		const search = sp.get("search")?.trim() || "";

		const client = getAdminClient() as any;

		let query = client
			.from("product_reviews")
			.select(
				"id, product_id, user_id, rating, title, body, reviewer_name, is_visible, reply, created_at, products!inner(name, slug)",
				{ count: "exact" },
			)
			.order("created_at", { ascending: false });

		if (search) {
			query = query.or(
				`reviewer_name.ilike.%${search}%,products.name.ilike.%${search}%,body.ilike.%${search}%`,
			);
		}

		const { data, count, error } = await query.range(
			offset,
			offset + limit - 1,
		);

		if (error) throw error;

		return NextResponse.json({
			reviews: (data ?? []) as ReviewRow[],
			total: (count ?? 0) as number,
			page,
			totalPages: Math.ceil((count ?? 0) / limit),
		});
	} catch (err) {
		return NextResponse.json(
			{ error: err instanceof Error ? err.message : "Unknown error" },
			{ status: 500 },
		);
	}
}
