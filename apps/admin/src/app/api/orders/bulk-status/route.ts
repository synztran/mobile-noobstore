import { logAuditEvent } from "@/lib/audit-log";
import { invalidateProductCaches } from "@/lib/redis/cache";
import { restoreOrderStock } from "@/lib/services/orderService";
import { getAdminClient } from "@/lib/supabase/admin";
import { createClient as createServerClient } from "@/lib/supabase/server";
import type { Database } from "@db-types";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const VALID_STATUSES = [
  "pending",
  "confirmed",
  "first_paid",
  "second_paid",
  "delivering",
  "delivered",
  "returning",
  "cancelled",
  "refunded",
] as const;

const TRANSITIONS: Record<string, Set<string>> = {
  pending: new Set(["confirmed", "first_paid", "cancelled"]),
  confirmed: new Set(["delivering", "second_paid", "cancelled", "refunded"]),
  first_paid: new Set(["second_paid", "cancelled", "refunded"]),
  second_paid: new Set(["delivering", "cancelled", "refunded"]),
  delivering: new Set(["delivered", "cancelled"]),
  delivered: new Set([]),
  returning: new Set(["refunded"]),
  cancelled: new Set([]),
  refunded: new Set([]),
};

type OrderUpdate = Database["public"]["Tables"]["orders"]["Update"];

function buildUpdate(status: string): OrderUpdate {
  const update: OrderUpdate = {};
  update.status = status;
  if (status === "confirmed") update.paid_at = new Date().toISOString();
  if (status === "first_paid") {
    (update as Record<string, unknown>).deposit_paid_at = new Date().toISOString();
  }
  if (status === "second_paid") {
    update.paid_at = new Date().toISOString();
  }
  if (status === "cancelled") {
    update.cancelled_at = new Date().toISOString();
    update.cancelled_note = "Bulk cancelled (admin)";
  }
  if (status === "refunded") update.refunded_at = new Date().toISOString();
  if (status === "delivering") {
    (update as Record<string, unknown>).delivering_at = new Date().toISOString();
  }
  if (status === "delivered") {
    (update as Record<string, unknown>).delivered_at = new Date().toISOString();
  }
  if (status === "returning") {
    (update as Record<string, unknown>).returning_at = new Date().toISOString();
  }
  return update;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      orderIds: string[];
      status: string;
    };

    if (
      !body.orderIds?.length ||
      !VALID_STATUSES.includes(body.status as typeof VALID_STATUSES[number])
    ) {
      return NextResponse.json(
        { error: "Invalid request: orderIds[] and a valid status are required" },
        { status: 400 }
      );
    }

    const supabase = getAdminClient();
    if (["confirmed", "first_paid", "second_paid"].includes(body.status)) {
      return NextResponse.json({ error: "Payment verification requires an individual receipt per order. Use the payment panel." }, { status: 409 });
    }

    // Fetch current orders to validate they exist
    const { data: orders } = await supabase
      .from("orders")
      .select("id, status, payment_type")
      .in("id", body.orderIds);

    if (!orders?.length) {
      return NextResponse.json(
        { error: "No matching orders found" },
        { status: 404 }
      );
    }

    const foundIds = new Set(orders.map((o) => o.id));
    const missingIds = body.orderIds.filter((id) => !foundIds.has(id));
    if (missingIds.length > 0) {
      return NextResponse.json(
        { error: `Orders not found: ${missingIds.join(", ")}` },
        { status: 404 }
      );
    }

    // Validate waterfall transitions for each order individually
    const invalidOrders: { id: string; from: string; to: string; reason: string }[] = [];
    const validOrderIds: string[] = [];

    for (const order of orders) {
      const allowed = TRANSITIONS[order.status];
      const isDeposit = order.payment_type === "deposit_cod";
      const usesDepositStatus =
        body.status === "first_paid" || body.status === "second_paid";

      if (isDeposit && body.status === "confirmed") {
        invalidOrders.push({
          id: order.id,
          from: order.status,
          to: body.status,
          reason:
            'Deposit orders must be marked "first_paid" (đặt cọc) instead of "confirmed"',
        });
        continue;
      }
      if (!isDeposit && usesDepositStatus) {
        invalidOrders.push({
          id: order.id,
          from: order.status,
          to: body.status,
          reason: `Status "${body.status}" is only valid for deposit orders`,
        });
        continue;
      }
      if (!allowed?.has(body.status)) {
        invalidOrders.push({
          id: order.id,
          from: order.status,
          to: body.status,
          reason: `Cannot transition from "${order.status}" to "${body.status}"`,
        });
        continue;
      }
      validOrderIds.push(order.id);
    }

    if (validOrderIds.length === 0) {
      return NextResponse.json(
        {
          error: `No orders can transition to "${body.status}". Transition rules: pending→confirmed/first_paid/cancelled, confirmed→delivering/second_paid/cancelled/refunded, first_paid→second_paid/cancelled/refunded, second_paid→delivering/cancelled/refunded, delivering→delivered/cancelled.`,
          failed: invalidOrders,
        },
        { status: 400 }
      );
    }

    // Restore stock for cancelled/refunded orders BEFORE updating status
    if (body.status === "cancelled" || body.status === "refunded") {
      const stockWarnings: string[] = [];
      for (const id of validOrderIds) {
        try {
          await restoreOrderStock(id);
        } catch (e) {
          stockWarnings.push(
            `Order ${id}: ${e instanceof Error ? e.message : "Unknown"}`
          );
        }
      }
      if (stockWarnings.length > 0) {
        console.warn("[bulk-status] Stock restore warnings:", stockWarnings);
      }
    }

    // Update only valid orders
    const update = buildUpdate(body.status);
    const { error } = await supabase
      .from("orders")
      .update(update)
      .in("id", validOrderIds);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Resolve acting admin for point-reversal audit guard (refunded flow).
    let adminId: string | null = null;
    if (body.status === "refunded") {
      const authClient = await createServerClient();
      const {
        data: { user: adminUser },
      } = await authClient.auth.getUser();
      adminId = adminUser?.id ?? null;
    }

    // Fire-and-forget side effects: push notifications, points, missions
    for (const id of validOrderIds) {
      if (
        body.status &&
        [
          "confirmed",
          "first_paid",
          "second_paid",
          "delivering",
          "delivered",
          "returning",
          "cancelled",
          "refunded",
        ].includes(body.status)
      ) {
        void triggerOrderSideEffects(supabase, id, body.status, adminId);
      }
    }

    // TODO(email): restore customer status notifications when a replacement
    // provider is configured. Bulk order updates still complete normally.

    // Invalidate storefront product caches so sold_count reflects the delivery
    if (body.status === "delivered") {
      await invalidateProductCaches();
    }

    // Confirmation seals reserved stock; cancel/refund restores it — refresh
    // the product cache so /shop and product pages don't show stale stock.
    if (
      body.status === "confirmed" ||
      body.status === "first_paid" ||
      body.status === "second_paid" ||
      body.status === "cancelled" ||
      body.status === "refunded"
    ) {
      await invalidateProductCaches();
    }

    // Log audit event for bulk action
    void logAuditEvent(
      {
        action: "order.bulk_update_status",
        entity_type: "orders",
        entity_id: validOrderIds.join(","),
        new_data: { status: body.status, updated_ids: validOrderIds },
      },
      supabase,
    );

    return NextResponse.json({
      success: true,
      updatedCount: validOrderIds.length,
      failed: invalidOrders.length > 0 ? invalidOrders : undefined,
    });
  } catch (err) {
    console.error("[bulk-status] Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function triggerOrderSideEffects(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  orderId: string,
  status: string,
  adminId: string | null
) {
  const { data: orderRow } = await supabase
    .from("orders")
    .select("user_id, order_number, total_price, cancelled_note")
    .eq("id", orderId)
    .single();

  if (!orderRow?.user_id || !orderRow?.order_number) return;

  // Gacha missions
  if (orderRow.total_price) {
    const { data: activeEvent } = await supabase
      .from("gacha_events")
      .select("id")
      .eq("is_active", true)
      .lte("start_at", new Date().toISOString())
      .gte("end_at", new Date().toISOString())
      .order("id", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (activeEvent) {
      const context: Record<string, unknown> = { order_status: status };
      if (orderRow.total_price) context.amount = Number(orderRow.total_price);
      await Promise.all([
        supabase.rpc("process_mission_progress", {
          p_user_id: orderRow.user_id,
          p_event_id: activeEvent.id,
          p_mission_type: "order_count",
          p_context: context,
        }),
        supabase.rpc("process_mission_progress", {
          p_user_id: orderRow.user_id,
          p_event_id: activeEvent.id,
          p_mission_type: "spend_amount",
          p_context: context,
        }),
      ]);
    }
  }

  // Points for delivered
  if (status === "delivered" && orderRow.total_price) {
    const { data: ptRows } = await supabase.rpc("compute_points_for_amount", {
      p_rule_type: "order_delivered",
      p_amount: Number(orderRow.total_price),
    });
    const points = Number(
      Array.isArray(ptRows)
        ? ptRows[0]?.compute_points_for_amount
        : ptRows
    );
    if (points > 0) {
      await supabase.rpc("earn_points", {
        p_user_id: orderRow.user_id,
        p_source_type: "order_delivered",
        p_source_ref: orderId,
        p_amount: points,
        p_note: `Order #${orderRow.order_number} delivered`,
      });
    }
  }

  // Reverse NSP points earned on delivery when a bulk-refunded order.
  if (status === "refunded" && adminId && orderRow.user_id) {
    await supabase.rpc("reverse_point_transactions", {
      p_admin_id: adminId,
      p_user_id: orderRow.user_id,
      p_source_ref: orderId,
      p_note: `Order #${orderRow.order_number} refunded (bulk)`,
    });
  }

  // Push notification
  let title = "";
  let nbody = "";
  const orderNum = orderRow.order_number;

  switch (status) {
    case "confirmed":
      title = "Xác nhận thanh toán";
      nbody = `Đơn hàng ${orderNum} đã được xác nhận thanh toán thành công với số tiền ${orderRow.total_price?.toLocaleString("vi-VN")}₫`;
      break;
    case "first_paid":
      title = "Xác nhận đặt cọc";
      nbody = `Đơn hàng ${orderNum} đã nhận được tiền đặt cọc (thanh toán lần 1).`;
      break;
    case "second_paid":
      title = "Xác nhận thanh toán đủ";
      nbody = `Đơn hàng ${orderNum} đã được thanh toán đầy đủ (thanh toán lần 2).`;
      break;
    case "delivering":
      title = `Đơn hàng ${orderNum} đang được vận chuyển`;
      nbody = `Đơn hàng ${orderNum} đã và đang được vận chuyển đến bạn.`;
      break;
    case "delivered":
      title = `Đơn hàng ${orderNum} đã được giao hàng thành công`;
      nbody = `Đơn hàng ${orderNum} đã được giao đến bạn. Cảm ơn bạn đã tin tưởng và mua hàng ở NoobStore`;
      break;
    case "returning":
      title = `Đơn hàng ${orderNum} đang chờ xác minh hoàn hàng`;
      nbody = `Gói hàng ${orderNum} đang được cửa hàng xác minh. Tiền sẽ được hoàn về tài khoản sau khi xác minh thành công.`;
      break;
    case "cancelled":
      title = `Đơn hàng ${orderNum} đã được hủy`;
      nbody = `Đơn hàng ${orderNum} đã được hủy. Với lí do: ${orderRow.cancelled_note ?? "Không có ghi chú"}`;
      break;
    case "refunded":
      title = `Đơn hàng ${orderNum} đã được hoàn trả tiền về bạn`;
      nbody = `Đơn hàng ${orderNum} đã được hoàn tiền về bạn.`;
      break;
  }

  if (!title || !nbody) return;

  const { data: inserted } = await supabase
    .from("user_notifications")
    .insert({
      user_id: orderRow.user_id,
      title,
      body: nbody,
      type: "order_status",
      deep_link: `/profile/orders/${orderId}`,
    })
    .select("id")
    .single();

  if (!inserted) return;

  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", orderRow.user_id)
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
        body: nbody,
        deepLink: `/profile/orders/${orderId}`,
        notificationId: inserted.id,
        icon: "/icon-192.png",
        badge: "/icon-192.png",
      },
    }),
  });
}
