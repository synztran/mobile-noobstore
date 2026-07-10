import { clearCart, getCartItems } from "@/lib/cart-service";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

async function checkStaleCart(
	supabase: ReturnType<typeof createClient> extends Promise<infer T> ? T : never,
	cartId: string,
	userId: string,
) {
	try {
		const { data: cart } = await supabase
			.from("carts")
			.select("updated_at")
			.eq("id", cartId)
			.single();

		if (!cart?.updated_at) return;

		const staleThreshold = 12 * 60 * 60 * 1000;
		const elapsed = Date.now() - new Date(cart.updated_at).getTime();

		if (elapsed < staleThreshold) return;

		const { data: existingNotif } = await supabase
			.from("user_notifications")
			.select("id")
			.eq("user_id", userId)
			.eq("type", "cart_reminder")
			.gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
			.limit(1);

		if (existingNotif?.length) return;

		const { data: itemCount } = await supabase
			.from("cart_items")
			.select("id", { count: "exact", head: true })
			.eq("cart_id", cartId);

		const title = "Bạn còn hàng trong giỏ!";
		const body = `Bạn có ${itemCount ?? 0} sản phẩm trong giỏ hàng. Hoàn tất đơn hàng ngay!`;

		const { data: inserted } = await supabase
			.from("user_notifications")
			.insert({
				user_id: userId,
				title,
				body,
				type: "cart_reminder",
				deep_link: "/cart",
			})
			.select("id")
			.single();

		if (!inserted) return;

		const { data: subs } = await supabase
			.from("push_subscriptions")
			.select("endpoint, p256dh, auth")
			.eq("user_id", userId)
			.eq("is_active", true);

		if (!subs?.length) return;

		const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
		const secret = process.env.NOTIFICATION_INTERNAL_SECRET;
		if (!supabaseUrl || !secret) return;

		await fetch(`${supabaseUrl}/functions/v1/send-web-push`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"x-notification-secret": secret,
			},
			body: JSON.stringify({
				subscriptions: subs,
				payload: {
					title,
					body,
					deepLink: "/cart",
					notificationId: inserted.id,
					icon: "/icon-192.png",
					badge: "/icon-192.png",
				},
			}),
		});
	} catch (err) {
		console.error("[cart/GET] stale check error:", err);
	}
}

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

		void checkStaleCart(supabase, existingCart.id, user.id);

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