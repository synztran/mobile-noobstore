import "server-only";

import type { Database } from "@/lib/supabase/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

type Supabase = SupabaseClient<Database>;

/**
 * Fire-and-forget stale-cart reminder (called after GET /api/cart).
 *
 * When a cart has been untouched for 12h and no `cart_reminder` notification
 * exists in the last 24h, inserts one and fans it out to the user's push
 * subscriptions via the send-web-push edge function.
 */
export async function sendStaleCartReminder(
	supabase: Supabase,
	cartId: string,
	userId: string,
): Promise<void> {
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

		const { count } = await supabase
			.from("cart_items")
			.select("id", { count: "exact", head: true })
			.eq("cart_id", cartId);

		// Skip empty carts — a "you have items in your cart" reminder for
		// 0 products is noise (`count` null = query failure, also skip).
		if (!count || count < 1) return;

		const title = "Bạn còn hàng trong giỏ!";
		const body = `Bạn có ${count} sản phẩm trong giỏ hàng. Hoàn tất đơn hàng ngay!`;

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
