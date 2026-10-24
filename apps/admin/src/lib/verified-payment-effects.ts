import "server-only";
import { getAdminClient } from "@/lib/supabase/admin";
import { notifyOrderStatusEmail } from "@/lib/order-status-email";
import { buildInvoiceInput, fetchInvoiceItems, generateAndStoreInvoice, type InvoiceOrderRow } from "@/lib/invoice";
import { invalidateProductCaches } from "@/lib/redis/cache";

/** Retain the existing paid-status side effects after ledger-owned transitions. */
export async function verifiedPaymentEffects(orderId: string, status: string) {
  if (!["confirmed", "first_paid", "second_paid"].includes(status)) return;
  const db = getAdminClient();
  const tasks: Promise<unknown>[] = [notifyOrderStatusEmail(db, orderId, status), invalidateProductCaches()];
  tasks.push((async () => {
    const { data: order } = await db.from("orders").select("*").eq("id", orderId).single();
    if (!order) return;
    if (["confirmed", "second_paid"].includes(status) && order.delivery_address) {
      const address = order.delivery_address as Record<string, string | null>;
      await generateAndStoreInvoice(orderId, buildInvoiceInput(order as InvoiceOrderRow, {
        customerName: [address.full_name, address.phone_number].filter(Boolean).join(" - ") || "Khách hàng",
        items: await fetchInvoiceItems(orderId),
      }));
    }
  })());
  tasks.push((async () => {
    const { data: order } = await db.from("orders").select("user_id, order_number, total_price").eq("id", orderId).single();
    if (!order?.user_id) return;
    const { data: event } = await db.from("gacha_events").select("id").eq("is_active", true)
      .lte("start_at", new Date().toISOString()).gte("end_at", new Date().toISOString()).order("id").limit(1).maybeSingle();
    if (event) await Promise.all(["order_count", "spend_amount"].map(type => db.rpc("process_mission_progress", {
      p_user_id: order.user_id!, p_event_id: event.id, p_mission_type: type,
      p_context: { order_status: status, amount: Number(order.total_price) },
    })));
    const { data: notification } = await db.from("user_notifications").insert({
      user_id: order.user_id, type: "order_status", title: status === "first_paid" ? "Xác nhận đặt cọc" : "Xác nhận thanh toán",
      body: `Đơn hàng ${order.order_number} đã được cửa hàng xác minh thanh toán.`, deep_link: `/profile/orders/${orderId}`,
    }).select("id").single();
    if (!notification) return;
    const { data: subscriptions } = await db.from("push_subscriptions").select("endpoint, p256dh, auth")
      .eq("user_id", order.user_id).eq("is_active", true);
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const secret = process.env.NOTIFICATION_INTERNAL_SECRET;
    if (subscriptions?.length && url && secret) await fetch(`${url}/functions/v1/send-web-push`, {
      method: "POST", headers: { "Content-Type": "application/json", "x-notification-secret": secret },
      body: JSON.stringify({ subscriptions, payload: {
        title: status === "first_paid" ? "Xác nhận đặt cọc" : "Xác nhận thanh toán",
        body: `Đơn hàng ${order.order_number} đã được cửa hàng xác minh thanh toán.`,
        deepLink: `/profile/orders/${orderId}`, notificationId: notification.id,
        icon: "/icon-192.png", badge: "/icon-192.png",
      } }),
    });
  })());
  const results = await Promise.allSettled(tasks);
  for (const result of results) if (result.status === "rejected") console.error("[verified-payment] side effect failed after commit", result.reason);
}
