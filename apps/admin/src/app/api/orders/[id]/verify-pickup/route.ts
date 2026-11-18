import { logAuditEvent } from "@/lib/audit-log";
import {
  MAX_PICKUP_CODE_TRIES,
  PICKUP_CODE_LOCK_MS,
  hashPickupCode,
  isPickupCodeExpired,
  isPickupCodeLocked,
} from "@/lib/pickup-code";
import { isPickupShippingMethod } from "@/lib/shipping-method";
import { invalidateProductCaches } from "@/lib/redis/cache";
import { regenerateSettledInvoice } from "@/lib/invoice";
import { getAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// ─── Delivered side-effects (mirror the PATCH handler's "delivered" block) ───

async function handleDeliveredSideEffects(
  supabase: ReturnType<typeof getAdminClient>,
  orderId: string
) {
  const { data: orderRow } = await supabase
    .from("orders")
    .select("user_id, total_price, order_number")
    .eq("id", orderId)
    .single();
  if (!orderRow?.user_id) return;
  const userId = orderRow.user_id;

  try {
    await invalidateProductCaches();
  } catch (cacheErr) {
    console.error("[verify-pickup] cache invalidation failed:", cacheErr);
  }

  // Regenerate the invoice with the balance settled (delivered).
  void regenerateSettledInvoice(orderId);

  // Rank upgrade
  void (async () => {
    try {
      const { data: ranks } = await supabase
        .from("customer_ranks")
        .select("*")
        .eq("is_active", true)
        .order("level", { ascending: true });
      if (!ranks || ranks.length === 0) return;

      const { data: orders } = await supabase
        .from("orders")
        .select("total_price")
        .eq("user_id", userId)
        .eq("status", "delivered");
      const totalSpent = (orders ?? []).reduce(
        (s, o) => s + Number(o.total_price),
        0
      );
      const orderCount = (orders ?? []).length;

      let newRankId = ranks[0].id;
      for (const rank of ranks) {
        if (
          totalSpent >= Number(rank.min_total_spent) &&
          orderCount >= rank.min_order_count
        ) {
          newRankId = rank.id;
        } else {
          break;
        }
      }

      const { data: userRow } = await supabase
        .from("users")
        .select("rank_id")
        .eq("id", userId)
        .maybeSingle();
      if (userRow?.rank_id === newRankId) return;

      await supabase
        .from("users")
        .update({ rank_id: newRankId, rank_updated_at: new Date().toISOString() })
        .eq("id", userId);
      await supabase.from("rank_history").insert({
        user_id: userId,
        from_rank_id: userRow?.rank_id ?? null,
        to_rank_id: newRankId,
        changed_by: "system",
        reason: "Order delivered — rank upgrade",
      });
    } catch (err) {
      console.error(`[verify-pickup] rank update failed for ${orderId}:`, err);
    }
  })();

  // Store points
  void (async () => {
    try {
      if (!orderRow.total_price) return;
      const { data: ptRows } = await (
        supabase.rpc as unknown as (
          fn: string,
          args: Record<string, unknown>
        ) => Promise<{ data: unknown; error: unknown }>
      )("compute_points_for_amount", {
        p_rule_type: "order_delivered",
        p_amount: Number(orderRow.total_price),
      });
      const points = Number(Array.isArray(ptRows) ? ptRows[0]?.compute_points_for_amount : ptRows);
      if (points > 0) {
        await (
          supabase.rpc as unknown as (
            fn: string,
            args: Record<string, unknown>
          ) => Promise<{ data: unknown; error: unknown }>
        )("earn_points", {
          p_user_id: userId,
          p_source_type: "order_delivered",
          p_source_ref: orderId,
          p_amount: points,
          p_note: `Order #${orderRow.order_number} delivered`,
        });
      }
    } catch (pointsErr) {
      console.error(`[verify-pickup] points failed for ${orderId}:`, pointsErr);
    }
  })();

  // Push notification (copied from PATCH "delivered")
  void (async () => {
    try {
      const title = `Đơn hàng ${orderRow.order_number} đã được giao hàng thành công`;
      let nbody = `Đơn hàng ${orderRow.order_number} đã được giao đến bạn. Cảm ơn bạn đã tin tưởng và mua hàng ở NoobStore`;
      const { data: inserted } = await supabase
        .from("user_notifications")
        .insert({
          user_id: userId,
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
        .eq("user_id", userId)
        .eq("is_active", true);
      if (!subs || subs.length === 0) return;

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
    } catch (pushErr) {
      console.error(`[verify-pickup] push failed for ${orderId}:`, pushErr);
    }
  })();
}

// ─── Route ──────────────────────────────────────────────────────────────────

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const body = (await request.json()) as { code?: unknown };
  const code = typeof body.code === "string" ? body.code.trim() : "";

  if (!/^\d{6}$/.test(code)) {
    return NextResponse.json(
      { error: "Mã nhận hàng gồm 6 chữ số." },
      { status: 400 }
    );
  }

  const supabase = getAdminClient();

  const { data: _data, error } = await supabase
    .from("orders")
    .select(
      "id, order_number, status, payment_type, paid_at, shipping_method_id, pickup_code_hash, pickup_code_expires_at, pickup_code_tries, pickup_code_locked_until, pickup_verified_at"
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const order = _data as any;

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  if (!isPickupShippingMethod(order.shipping_method_id)) {
    return NextResponse.json(
      { error: "Order is not a pickup order" },
      { status: 400 }
    );
  }

  if (order.pickup_verified_at) {
    return NextResponse.json(
      { error: "Order already verified at pickup" },
      { status: 400 }
    );
  }

  const fullyPaid =
    order.payment_type === "deposit_cod"
      ? order.status === "second_paid"
      : order.status === "confirmed";

  if (!fullyPaid) {
    return NextResponse.json(
      {
        error:
          "Chỉ xác minh được khi đơn hàng đã thanh toán đủ (đặt cọc cần thanh toán lần 1 và lần 2).",
      },
      { status: 400 }
    );
  }

  if (isPickupCodeLocked(order.pickup_code_locked_until)) {
    return NextResponse.json(
      {
        error: "Đã nhập sai quá nhiều lần. Mã bị khóa.",
        lockSecondsLeft: Math.max(
          0,
          Math.ceil(
            (Date.parse(order.pickup_code_locked_until) - Date.now()) / 1000
          )
        ),
      },
      { status: 429 }
    );
  }

  const hasActiveCode =
    order.pickup_code_hash &&
    !isPickupCodeExpired(order.pickup_code_expires_at);
  if (!hasActiveCode) {
    return NextResponse.json(
      { error: "Customer has no active pickup code." },
      { status: 400 }
    );
  }

  const tries = Number(order.pickup_code_tries ?? 0);

  if (hashPickupCode(code) !== order.pickup_code_hash) {
    const newTries = tries + 1;
    const now = Date.now();

    if (newTries >= MAX_PICKUP_CODE_TRIES) {
      const lockedUntil = new Date(now + PICKUP_CODE_LOCK_MS);
      await supabase
        .from("orders")
        .update({
          pickup_code_tries: newTries,
          pickup_code_locked_until: lockedUntil.toISOString(),
        })
        .eq("id", id);
      void logAuditEvent(
        {
          action: "pickup.verify_locked",
          entity_type: "orders",
          entity_id: id,
          old_data: {
            pickup_code_tries: tries,
            pickup_code_locked_until: order.pickup_code_locked_until,
          },
          new_data: {
            pickup_code_tries: newTries,
            pickup_code_locked_until: lockedUntil.toISOString(),
          },
        },
        supabase
      );
      return NextResponse.json(
        {
          error: "Nhập sai quá 5 lần. Mã bị khóa trong 15 phút.",
          remainingTries: 0,
          lockSecondsLeft: PICKUP_CODE_LOCK_MS / 1000,
        },
        { status: 429 }
      );
    }

    await supabase
      .from("orders")
      .update({ pickup_code_tries: newTries })
      .eq("id", id);
    void logAuditEvent(
      {
        action: "pickup.verify_wrong",
        entity_type: "orders",
        entity_id: id,
        old_data: { pickup_code_tries: tries },
        new_data: { pickup_code_tries: newTries },
      },
      supabase
    );
    return NextResponse.json(
      {
        error: "Mã nhận hàng không đúng.",
        remainingTries: MAX_PICKUP_CODE_TRIES - newTries,
      },
      { status: 400 }
    );
  }

  // Success — clear the code (single-use), mark verified and deliver the order.
  const nowIso = new Date().toISOString();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const update: Record<string, unknown> = {
    pickup_code_hash: null,
    pickup_code_expires_at: null,
    pickup_code_tries: 0,
    pickup_code_locked_until: null,
    pickup_verified_at: nowIso,
    status: "delivered",
    delivered_at: nowIso,
  };
  // A pickup code proves handover identity, not payment. Database requires
  // verified receipts covering the balance before this delivery transition.

  const { error: updateError } = await supabase
    .from("orders")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .update(update as any)
    .eq("id", id);
  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  void logAuditEvent(
    {
      action: "pickup.verify",
      entity_type: "orders",
      entity_id: id,
      old_data: {
        status: order.status,
        pickup_verified_at: null,
        pickup_code_hash: order.pickup_code_hash ? "[REDACTED]" : null,
      },
      new_data: {
        status: "delivered",
        pickup_verified_at: nowIso,
      },
    },
    supabase
  );

  void handleDeliveredSideEffects(supabase, id);

  return NextResponse.json({
    success: true,
    orderNumber: order.order_number,
    verifiedAt: nowIso,
  });
}
