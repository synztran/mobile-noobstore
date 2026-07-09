import { clearCart, getCartItems, getOrCreateCart } from "@/lib/cart-service";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
	try {
		const supabase = await createClient();
		const {
			data: { user },
		} = await supabase.auth.getUser();

		let cartId: string | null = null;

		if (user) {
			const { data: existingCart } = await supabase
				.from("carts")
				.select("id")
				.eq("user_id", user.id)
				.eq("status", "active")
				.maybeSingle();

			if (existingCart) {
				cartId = existingCart.id;
			}
		} else {
			const cartCookie = req.cookies.get("noobstore-cart-id")?.value ?? null;
			if (cartCookie) {
				const { data: existingCart } = await supabase
					.from("carts")
					.select("id")
					.eq("id", cartCookie)
					.eq("status", "active")
					.maybeSingle();

				if (existingCart) {
					cartId = existingCart.id;
				}
			}
		}

		if (!cartId) {
			return NextResponse.json({ cart_id: null, items: [] });
		}

		const items = await getCartItems(supabase, cartId);

		return NextResponse.json({ cart_id: cartId, items });
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

		const response = NextResponse.json({ success: true });

		response.cookies.set("noobstore-cart-id", "", {
			httpOnly: true,
			sameSite: "lax",
			maxAge: 0,
			path: "/",
		});

		return response;
	} catch (err) {
		console.error("[cart/DELETE] error:", err);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
