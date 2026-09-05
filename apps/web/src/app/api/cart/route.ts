import { sendStaleCartReminder } from "@/modules/cart/server/reminders";
import { clearCart, getCartItems } from "@/modules/cart/server/service";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
	try {
		const supabase = await createClient();
		const {
			data: { user },
		} = await supabase.auth.getUser();

		if (!user) {
			return NextResponse.json({ cart_id: null, items: [] });
		}

		const { data: existingCart } = await supabase
			.from("carts")
			.select("id")
			.eq("user_id", user.id)
			.eq("status", "active")
			.maybeSingle();

		if (!existingCart) {
			return NextResponse.json({ cart_id: null, items: [] });
		}

		const items = await getCartItems(supabase, existingCart.id);

		void sendStaleCartReminder(supabase, existingCart.id, user.id);

		return NextResponse.json({ cart_id: existingCart.id, items });
	} catch (err) {
		console.error("[cart/GET] error:", err);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

export async function DELETE(req: NextRequest) {
	try {
		const supabase = await createClient();
		const sp = req.nextUrl.searchParams;
		const cartId = sp.get("cart_id")?.trim();

		if (!cartId) {
			return NextResponse.json(
				{ error: "cart_id is required" },
				{ status: 400 },
			);
		}

		await clearCart(supabase, cartId);

		return NextResponse.json({ success: true });
	} catch (err) {
		console.error("[cart/DELETE] error:", err);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}