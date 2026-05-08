import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface RemoveWishlistRequest {
	productId: string;
}

export async function POST(req: NextRequest) {
	try {
		const body = (await req.json()) as Partial<RemoveWishlistRequest>;

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

		const { error } = await supabase
			.from("wishlists")
			.delete()
			.eq("user_id", user.id)
			.eq("product_id", body.productId);

		if (error) {
			return NextResponse.json({ error: error.message }, { status: 500 });
		}

		return NextResponse.json({ success: true });
	} catch (err) {
		console.error("[wishlist/remove] unexpected error:", err);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
