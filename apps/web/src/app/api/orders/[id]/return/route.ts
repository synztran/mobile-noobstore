import { createClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { isPickupShippingMethod } from "@/lib/shipping-method";
import { notifyCustomerRequestReturn } from "@/lib/telegram/telegram.service";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const RETURN_WINDOW_MS = 3 * 24 * 60 * 60 * 1000; // 3 days after delivery

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Order ID is required" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const reason = (body?.reason ?? "").trim().slice(0, 2000);

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: order, error: fetchError } = await supabase
      .from("orders")
      .select("id, status, delivered_at, order_number, total_price, shipping_method_id")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (fetchError) {
      return NextResponse.json(
        { error: "Failed to fetch order" },
        { status: 500 }
      );
    }

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Store-pickup orders are not eligible for refunds/returns.
    if (isPickupShippingMethod(order.shipping_method_id)) {
      return NextResponse.json(
        {
          error:
            "Đơn mua tại cửa hàng không hỗ trợ hoàn hàng/trả tiền.",
        },
        { status: 400 }
      );
    }

    if (order.status !== "delivered") {
      return NextResponse.json(
        {
          error:
            "Đơn hàng chưa giao nên chưa thể yêu cầu hoàn hàng hoặc đơn đã ở trạng thái khác.",
        },
        { status: 400 }
      );
    }

    // Only allow a return request within 3 days of delivery.
    if (!order.delivered_at) {
      return NextResponse.json(
        { error: "Thiếu thông tin thời gian giao hàng." },
        { status: 400 }
      );
    }
    const deliveredAt = new Date(order.delivered_at).getTime();
    if (Number.isNaN(deliveredAt) || Date.now() - deliveredAt > RETURN_WINDOW_MS) {
      return NextResponse.json(
        {
          error:
            "Đã quá thời gian cho phép hoàn hàng (3 ngày kể từ khi nhận hàng).",
        },
        { status: 400 }
      );
    }

    if (!reason) {
      return NextResponse.json(
        { error: "Vui lòng cung cấp lý do hoàn hàng." },
        { status: 400 }
      );
    }

    // Return request via admin client — orders UPDATE removed from user RLS
    const admin = getAdminClient();
    const { error: updateError } = await (
      admin.from("orders") as unknown as {
        update: (value: Record<string, unknown>) => { eq: (col: string, val: string) => Promise<{ error: { message: string } | null }> };
      }
    )
      .update({
        status: "returning",
        returning_at: new Date().toISOString(),
        returning_reason: reason,
      })
      .eq("id", id);

    if (updateError) {
      console.error("[return order] update error:", updateError);
      return NextResponse.json(
        { error: "Không thể gửi yêu cầu hoàn hàng. Vui lòng thử lại." },
        { status: 500 }
      );
    }

    // Notify store owner via Telegram (awaited so it isn't dropped on serverless).
    const customerName =
      user.user_metadata?.full_name ?? user.email ?? "Khách";
    try {
      await notifyCustomerRequestReturn(
        order.order_number,
        customerName,
        Number(order.total_price ?? 0),
        reason
      );
    } catch (notifyErr) {
      console.error("[return order] Telegram notification failed:", notifyErr);
    }

    // Notify admin(s) via in-app push + web push (fire-and-forget).
    void (async () => {
      try {
        const admin = getAdminClient();
        const { data: adminUsers } = await admin
          .from("users")
          .select("id")
          .eq("role", "admin");

        if (!adminUsers?.length) return;

        for (const a of adminUsers) {
          const { data: inserted } = await admin
            .from("user_notifications")
            .insert({
              user_id: a.id,
              title: "Yêu cầu hoàn hàng mới",
              body: `Đơn hàng ${order.order_number} vừa được khách yêu cầu hoàn hàng.`,
              type: "order_status",
              deep_link: "/admin/orders",
            })
            .select("id")
            .single();

          const { data: subs } = await admin
            .from("push_subscriptions")
            .select("endpoint, p256dh, auth")
            .eq("user_id", a.id)
            .eq("is_active", true);

          if (!subs?.length) continue;

          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
          const secret = process.env.NOTIFICATION_INTERNAL_SECRET;
          if (!supabaseUrl || !secret) continue;

          await fetch(`${supabaseUrl}/functions/v1/send-web-push`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-notification-secret": secret,
            },
            body: JSON.stringify({
              subscriptions: subs,
              payload: {
                title: "Yêu cầu hoàn hàng mới",
                body: `Đơn hàng ${order.order_number} vừa được khách yêu cầu hoàn hàng.`,
                deepLink: "/admin/orders",
                notificationId: inserted?.id ?? null,
                icon: "/icon-192.png",
                badge: "/icon-192.png",
              },
            }),
          });
        }
      } catch (pushErr) {
        console.error("[return order] admin push notification failed:", pushErr);
      }
    })();

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[return order] error:", error);
    return NextResponse.json(
      { error: "Failed to request return" },
      { status: 500 }
    );
  }
}