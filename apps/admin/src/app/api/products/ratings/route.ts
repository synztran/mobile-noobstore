import { getAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface ProductRatingRow {
	id: string;
	name: string;
	slug: string;
	thumbnail: string | null;
	disable_ratings: boolean;
}

export async function GET(req: NextRequest) {
	try {
		const sp = req.nextUrl.searchParams;
		const page = Math.max(1, Number(sp.get("page")) || 1);
		const limit = Math.min(50, Math.max(1, Number(sp.get("limit")) || 20));
		const offset = (page - 1) * limit;
		const search = sp.get("search")?.trim() || "";
		const disabledOnly = sp.get("disabledOnly") === "true";

		const client = getAdminClient() as any;

		let query = client
			.from("products")
			.select(
				`id, name, slug, thumbnail, disable_ratings,
				 reviews:product_reviews(count)`,
				{ count: "exact" },
			)
			.eq("is_active", true)
			.in("product_type", ["standard", "kit"])
			.order("name", { ascending: true });

		if (disabledOnly) {
			query = query.eq("disable_ratings", true);
		}

		if (search) {
			query = query.ilike("name", `%${search}%`);
		}

		const { data, count, error } = await query.range(
			offset,
			offset + limit - 1,
		);

		if (error) throw error;

		const rows = (data ?? []) as ProductRatingRow[];
		const productIds = rows.map((r) => r.id);
		const avgRatings = new Map<string, number>();

		if (productIds.length > 0) {
			const { data: aggData } = await client
				.from("product_reviews")
				.select("product_id, rating")
				.in("product_id", productIds);

			if (aggData) {
				const groups = new Map<string, number[]>();
				for (const r of aggData as { product_id: string; rating: number }[]) {
					const list = groups.get(r.product_id) ?? [];
					list.push(r.rating);
					groups.set(r.product_id, list);
				}
				for (const [pid, ratings] of groups) {
					avgRatings.set(
						pid,
						Math.round(
							(ratings.reduce((s, v) => s + v, 0) / ratings.length) * 10,
						) / 10,
					);
				}
			}
		}

		const result = rows.map((r) => ({
			id: r.id,
			name: r.name,
			slug: r.slug,
			thumbnail: r.thumbnail,
			disable_ratings: r.disable_ratings,
			review_count:
				(r as any).reviews?.[0]?.count ?? 0,
			avg_rating: avgRatings.get(r.id) ?? null,
		}));

		return NextResponse.json({
			products: result,
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

export async function PATCH(req: NextRequest) {
	try {
		const body = await req.json();
		const { product_id, disable_ratings } = body;

		if (!product_id || disable_ratings === undefined) {
			return NextResponse.json(
				{ error: "product_id and disable_ratings are required" },
				{ status: 400 },
			);
		}

		const client = getAdminClient() as any;
		const { error } = await client
			.from("products")
			.update({ disable_ratings })
			.eq("id", product_id);

		if (error) throw error;
		return NextResponse.json({ success: true });
	} catch (err) {
		return NextResponse.json(
			{ error: err instanceof Error ? err.message : "Unknown error" },
			{ status: 500 },
		);
	}
}
