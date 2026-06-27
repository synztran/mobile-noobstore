import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export interface AddWishlistRequest {
	productId: string;
}

export interface AddWishlistResponse {
	success: boolean;
	wishlistId: string;
}

export async function POST(req: NextRequest) {
	try {
		const body = (await req.json()) as Partial<AddWishlistRequest>;

		if (!body.productId || typeof body.productId !== "string") {
			return NextResponse.json(
				{ error: "productId is required" },
				{ status: 400 },
			);
		}

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

		const { data: product, error: productError } = await supabase
			.from("products")
      .select("id")
      .eq("is_active", true)
      .eq("id", body.productId)
			.maybeSingle();

		if (productError) {
			return NextResponse.json(
				{ error: productError.message },
				{ status: 500 },
			);
		}

		if (!product) {
			return NextResponse.json(
				{ error: "Product not found" },
				{ status: 404 },
			);
		}

		const { data, error } = await (
			supabase.from as unknown as (table: string) => {
				upsert: (
					row: { user_id: string; product_id: string },
					options: { onConflict: string; ignoreDuplicates: boolean },
				) => {
					select: (columns: string) => {
						single: () => Promise<{
							data: { id: string } | null;
							error: { message: string } | null;
						}>;
					};
				};
			}
		)("wishlists")
			.upsert(
				{ user_id: user.id, product_id: body.productId },
				{ onConflict: "user_id,product_id", ignoreDuplicates: false },
			)
			.select("id")
			.single();

		if (error || !data) {
			return NextResponse.json(
				{ error: error?.message ?? "Failed to add wishlist item" },
				{ status: 500 },
			);
		}

		return NextResponse.json({
			success: true,
			wishlistId: data.id,
		} satisfies AddWishlistResponse);
	} catch (err) {
		console.error("[wishlist/add] unexpected error:", err);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
