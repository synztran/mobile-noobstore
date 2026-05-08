import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export interface WishlistProductSummary {
	id: string;
	name: string;
	slug: string;
	base_price: number;
	thumbnail: string | null;
	stock_quantity: number | null;
	brand: string | null;
}

export interface WishlistItemResponse {
	id: string;
	product_id: string;
	added_at: string;
	product: WishlistProductSummary | null;
}

export async function GET() {
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

		const { data, error } = await (
			supabase.from as unknown as (table: string) => {
				select: (columns: string) => {
					eq: (
						column: string,
						value: string,
					) => {
						order: (
							column: string,
							options: { ascending: boolean },
						) => Promise<{
							data: Array<{
								id: string;
								product_id: string;
								added_at: string;
								products: {
									id: string;
									name: string;
									slug: string;
									base_price: number;
									thumbnail: string | null;
									stock_quantity: number | null;
									brand: string | null;
								} | null;
							}> | null;
							error: { message: string } | null;
						}>;
					};
				};
			}
		)("wishlists")
			.select(
				"id, product_id, added_at, products(id, name, slug, base_price, thumbnail, stock_quantity, brand)",
			)
			.eq("user_id", user.id)
			.order("added_at", { ascending: false });

		if (error) {
			return NextResponse.json({ error: error.message }, { status: 500 });
		}

		const items: WishlistItemResponse[] = (data ?? []).map((row) => ({
			id: row.id,
			product_id: row.product_id,
			added_at: row.added_at,
			product: row.products
				? {
						id: row.products.id,
						name: row.products.name,
						slug: row.products.slug,
						base_price: Number(row.products.base_price),
						thumbnail: row.products.thumbnail,
						stock_quantity: row.products.stock_quantity,
						brand: row.products.brand,
					}
				: null,
		}));

		return NextResponse.json(items);
	} catch (err) {
		console.error("[wishlist] unexpected error:", err);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
