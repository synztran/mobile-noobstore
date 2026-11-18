import { logAuditEvent } from "@/lib/audit-log";
import { formatVND } from "@/lib/currency";
import {
  buildInvoiceInput,
  fetchInvoiceItems,
  generateAndStoreInvoice,
  regenerateSettledInvoice,
  type InvoiceOrderRow,
} from "@/lib/invoice";
import { notifyOrderStatusEmail } from "@/lib/order-status-email";
import { invalidateProductCaches } from "@/lib/redis/cache";
import { restoreOrderStock } from "@/lib/services/orderService";
import { getAdminClient } from "@/lib/supabase/admin";
import { createClient as createServerClient } from "@/lib/supabase/server";
import type { Database } from "@db-types";
import { buildTrackingUrl } from "@web-tracking";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Ceiling for a staff-entered courier fee. Guards against a stray keypress
// (5,000,000₫ ≈ 200× a normal intra-city parcel) turning into a real charge.
const MAX_COURIER_SHIPPING_FEE = 5_000_000;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = getAdminClient();

  const { data: _data, error } = await supabase
    .from("orders")
    .select(
      `
			id, order_number, status, total_price, shipping_fee,
			voucher_code, voucher_discount_amount, shipping_discount_amount,
			created_at, updated_at, cancelled_at, cancelled_note, paid_at, refunded_at, delivering_at, delivered_at, returning_at, returning_reason,
			delivery_address, shipping_method_id, expected_delivery_at, pickup_at,
			pickup_code_expires_at, pickup_code_tries, pickup_code_locked_until, pickup_verified_at,
			tracking_carrier_id, tracking_number,
			carriers(id, name, logo, tracking_url_template),
			user_id,
			invoice_url,
			payment_type, deposit_percentage, deposit_amount, remaining_amount, deposit_paid_at,
			users(id, first_name, last_name, email, phone_number),
			order_items(id, product_id, product_name, quantity, unit_price, thumbnail, is_pre_order, pre_order_config, pre_order_tracking, order_item_components(id, component_group, variant_name, price_adjustment, product_variant_id, thumbnail, is_pre_order, pre_order_config)),
			order_services(
				id, service_id, service_name, price, quantity, selected_options, customer_note,
				services(base_price)
			)
		`
    )
    .eq("id", id)
    .single();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = _data as any;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  // Resolve option value labels from selected_options
  type SelectedOptions = Record<
    string,
    { option_value_id: number; price_adjustment: number }
  >;
  const optionValueIds = (
    data.order_services as unknown as {
      selected_options: SelectedOptions;
    }[]
  )
    .flatMap((svc) =>
      Object.values(svc.selected_options ?? {}).map((v) => v.option_value_id)
    )
    .filter(Boolean);

  let optionValueMap: Record<
    string,
    { optionLabel: string; valueLabel: string }
  > = {};

  if (optionValueIds.length > 0) {
    const { data: values } = await supabase
      .from("service_option_values")
      .select("id, label, service_options(label)")
      .in("id", optionValueIds);

    for (const v of values ?? []) {
      const optionLabel = Array.isArray(v.service_options)
        ? ((v.service_options[0] as { label: string })?.label ?? "")
        : ((v.service_options as { label: string } | null)?.label ?? "");
      optionValueMap[String(v.id)] = { optionLabel, valueLabel: v.label };
    }
  }

  // Fetch user's default shipping address
  let shippingAddress = null;
  if (data.user_id) {
    const { data: addr } = await supabase
      .from("user_addresses")
      .select(
        "full_name, phone_number, address_line, ward, ward_code, district, district_code, city"
      )
      .eq("user_id", data.user_id)
      .eq("is_default", true)
      .maybeSingle();
    shippingAddress = addr;
  }

  const { data: shippingMethods } = await supabase
    .from("shipping_methods")
    .select("id, name");

  const shippingMethodMap = Object.fromEntries(
    (shippingMethods ?? []).map((method) => [method.id, method.name])
  );

  // Attach gift info to order items
  if (data.order_items?.length > 0) {
    const productIds = Array.from(
      new Set(
        data.order_items
          .map((i: Record<string, unknown>) => i.product_id as string)
          .filter(Boolean)
      )
    ) as string[];
    const { data: giftRows } = await supabase
      .from("gift_products")
      .select(
        "product_id, quantity, gift:gift_product_id!inner(name, thumbnail)"
      )
      .in("product_id", productIds);

    if (giftRows) {
      const giftsByProductId: Record<
        string,
        Array<{
          gift_name: string;
          gift_thumbnail: string | null;
          quantity: number;
        }>
      > = {};
      for (const g of giftRows as unknown as Array<Record<string, unknown>>) {
        const pid = g.product_id as string;
        const gift = g.gift as Record<string, unknown>;
        if (!giftsByProductId[pid]) giftsByProductId[pid] = [];
        giftsByProductId[pid].push({
          gift_name: (gift.name as string) ?? "",
          gift_thumbnail: (gift.thumbnail as string) ?? null,
          quantity: Number(g.quantity ?? 1),
        });
      }
      for (const item of data.order_items as Array<Record<string, unknown>>) {
        const pid = item.product_id as string | undefined;
        item.gifts = pid ? (giftsByProductId[pid] ?? null) : null;
      }
    }
  }

  let pointsEarned = 0;
  const { data: pointTxns } = await supabase
    .from("point_transactions")
    .select("delta")
    .eq("source_ref", id)
    .eq("source_type", "order_delivered");
  if (pointTxns && pointTxns.length > 0) {
    pointsEarned = pointTxns.reduce((sum, t) => sum + Number(t.delta), 0);
  }

  return NextResponse.json({
    ...data,
    optionValueMap,
    shippingAddress,
    shippingMethodMap,
    points_earned: pointsEarned,
  });
}

// ─── Rank computation on delivered ──────────────────────────────────────────
async function handleRankUpdate(
  supabase: ReturnType<typeof getAdminClient>,
  orderId: string
) {
  try {
    const { data: orderRow } = await supabase
      .from("orders")
      .select("user_id")
      .eq("id", orderId)
      .single();

    if (!orderRow?.user_id) return;

    const userId = orderRow.user_id;

    // Fetch all active ranks
    const { data: ranks } = await supabase
      .from("customer_ranks")
      .select("*")
      .eq("is_active", true)
      .order("level", { ascending: true });

    if (!ranks || ranks.length === 0) return;

    // Fetch user's order stats
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

    // Find highest qualifying rank
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

    // Get current rank
    const { data: userRow } = await supabase
      .from("users")
      .select("rank_id")
      .eq("id", userId)
      .maybeSingle();

    const currentRankId = userRow?.rank_id ?? null;
    if (currentRankId === newRankId) return;

    // Update user
    await supabase
      .from("users")
      .update({ rank_id: newRankId, rank_updated_at: new Date().toISOString() })
      .eq("id", userId);

    // Record history
    await supabase.from("rank_history").insert({
      user_id: userId,
      from_rank_id: currentRankId,
      to_rank_id: newRankId,
      changed_by: "system",
      reason: "Order delivered — rank upgrade",
    });
  } catch (err) {
    console.error(
      `[orders] handleRankUpdate failed for order ${orderId}:`,
      err
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = (await req.json()) as {
    status?: string;
    cancelled_note?: string;
    advance_pre_order?: {
      item_ids: string[];
    };
    tracking_carrier_id?: string | null;
    tracking_number?: string | null;
    shipping_fee?: number | null;
  };

  const supabase = getAdminClient();

  // ── Handle pre-order tracking advancement ───────────────────────────
  if (body.advance_pre_order) {
    const itemIds = body.advance_pre_order.item_ids;
    if (!Array.isArray(itemIds) || itemIds.length === 0) {
      return NextResponse.json({ error: "item_ids required" }, { status: 400 });
    }

    const PRE_ORDER_STEPS = [
      "paid",
      "placed",
      "international_shipping",
      "customs",
      "local_delivering",
      "ready",
    ];

    const { data: rawItems } = (await supabase
      .from("order_items")
      .select("id, pre_order_tracking")
      .in("id", itemIds)) as unknown as {
      data: Array<{ id: string; pre_order_tracking: unknown }> | null;
    };

    const items = rawItems as Array<{
      id: string;
      pre_order_tracking: Record<string, unknown> | null;
    }> | null;

    if (!items) {
      return NextResponse.json({ error: "Items not found" }, { status: 404 });
    }

    const updates: Array<{ id: string; pre_order_tracking: unknown }> = [];
    for (const item of items) {
      const tracking =
        (item.pre_order_tracking as Record<string, unknown>) ?? {};
      const currentStep = (tracking.current_step as string) ?? null;
      const steps = (tracking.steps as Record<string, string | null>) ?? {};

      const currentIdx = currentStep
        ? PRE_ORDER_STEPS.indexOf(currentStep)
        : -1;
      const nextIdx = currentIdx + 1;

      if (nextIdx >= PRE_ORDER_STEPS.length) continue;

      const nextStep = PRE_ORDER_STEPS[nextIdx];
      updates.push({
        id: item.id,
        pre_order_tracking: {
          current_step: nextStep,
          steps: { ...steps, [nextStep]: new Date().toISOString() },
        },
      });
    }

    for (const upd of updates) {
      const { error: updErr } = await (supabase.from("order_items") as any)
        .update({ pre_order_tracking: upd.pre_order_tracking })
        .eq("id", upd.id);

      if (updErr) {
        console.error(
          `[orders] failed to advance pre-order item ${upd.id}:`,
          updErr
        );
      }
    }

    return NextResponse.json({ success: true, advanced: updates.length });
  }

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
  ];
  if (body.status && ["confirmed", "first_paid", "second_paid"].includes(body.status)) {
    return NextResponse.json(
      { error: "Record verified receipts in the payment panel; payment status cannot be set manually." },
      { status: 409 }
    );
  }
  if (body.status && !VALID_STATUSES.includes(body.status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  // Enforce refund transition rules server-side. A status flip to "refunded"
  // is only legal from the returning/confirmed/delivering statuses, or from
  // "delivered" (regardless of age — the client displays the 72h window hint).
  if (body.status === "refunded") {
    const { data: currentOrder } = await supabase
      .from("orders")
      .select("status")
      .eq("id", id)
      .single();
    const currentStatus = currentOrder?.status ?? null;

    const canRefund =
      currentStatus === "returning" ||
      currentStatus === "confirmed" ||
      currentStatus === "first_paid" ||
      currentStatus === "second_paid" ||
      currentStatus === "delivering" ||
      currentStatus === "delivered";

    if (!canRefund) {
      const message =
        currentStatus === "refunded"
          ? "Order is already refunded"
          : `Order cannot be refunded from status "${currentStatus}"`;
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }

  // Enforce deposit-payment status rules: first_paid/second_paid are the two
  // installment milestones for deposit orders, and deposit orders must never
  // enter "confirmed". Full-payment orders ignore the new statuses.
  if (
    body.status === "confirmed" ||
    body.status === "first_paid" ||
    body.status === "second_paid"
  ) {
    const { data: currentOrder } = await supabase
      .from("orders")
      .select("status, payment_type")
      .eq("id", id)
      .single();
    const currentStatus = currentOrder?.status ?? null;
    const orderPaymentType = currentOrder?.payment_type ?? null;
    const isDeposit = orderPaymentType === "deposit_cod";

    if (isDeposit && body.status === "confirmed") {
      return NextResponse.json(
        {
          error:
            'Deposit orders must be marked "first_paid" (đặt cọc) instead of "confirmed"',
        },
        { status: 400 }
      );
    }
    if (
      !isDeposit &&
      (body.status === "first_paid" || body.status === "second_paid")
    ) {
      return NextResponse.json(
        {
          error: `Status "${body.status}" is only valid for deposit orders`,
        },
        { status: 400 }
      );
    }
    if (
      body.status === "first_paid" &&
      currentStatus !== "pending" &&
      !(isDeposit && currentStatus === "confirmed")
    ) {
      return NextResponse.json(
        {
          error:
            '"first_paid" (đặt cọc) can only be marked from "pending" (or legacy "confirmed" for deposit orders)',
        },
        { status: 400 }
      );
    }
    if (
      body.status === "second_paid" &&
      currentStatus !== "first_paid" &&
      !(isDeposit && currentStatus === "confirmed")
    ) {
      return NextResponse.json(
        {
          error:
            '"second_paid" requires the order to be "first_paid" first (deposit orders still in legacy "confirmed" count as first_paid)',
        },
        { status: 400 }
      );
    }
  }

  type OrderUpdate = Database["public"]["Tables"]["orders"]["Update"];
  const update: OrderUpdate = {};
  if (body.status) update.status = body.status;

  // Fetch payment_type to determine deposit vs full payment
  let paymentType: string | null = null;
  if (
    body.status === "confirmed" ||
    body.status === "delivered" ||
    body.status === "first_paid" ||
    body.status === "second_paid"
  ) {
    const { data: orderRow } = await supabase
      .from("orders")
      .select("payment_type")
      .eq("id", id)
      .single();
    paymentType =
      (orderRow as { payment_type?: string } | null)?.payment_type ?? null;
  }

  if (body.status === "confirmed") {
    if (paymentType === "deposit_cod") {
      (update as Record<string, unknown>).deposit_paid_at =
        new Date().toISOString();
    } else {
      update.paid_at = new Date().toISOString();
    }
  }
  if (body.status === "first_paid") {
    // Instalment 1 — customer paid the deposit
    (update as Record<string, unknown>).deposit_paid_at =
      new Date().toISOString();
  }
  if (body.status === "second_paid") {
    // Instalment 2 — customer paid the remaining balance
    update.paid_at = new Date().toISOString();
  }
  if (body.status === "delivered") {
    (update as Record<string, unknown>).delivered_at = new Date().toISOString();
    // Delivery is not evidence of money collected. Record cash/COD first.
  }
  if (body.status === "cancelled") {
    update.cancelled_at = new Date().toISOString();
    update.cancelled_note = body.cancelled_note ?? null;
  }
  if (body.status === "refunded") {
    update.refunded_at = new Date().toISOString();
  }
  if (body.status === "delivering") {
    (update as Record<string, unknown>).delivering_at =
      new Date().toISOString();
  }
  if (body.status === "returning") {
    (update as Record<string, unknown>).returning_at =
      new Date().toISOString();
  }

  if (body.tracking_carrier_id !== undefined) {
    update.tracking_carrier_id = body.tracking_carrier_id || null;
  }
  if (body.tracking_number !== undefined) {
    update.tracking_number = body.tracking_number?.trim() || null;
  }

  // Fetch old data for audit log. Also needed for the courier-fee delta below,
  // which must know the fee/total/remaining it is adjusting — and for the
  // customer status email, which must only fire on an actual TRANSITION (see
  // the notify block after the write).
  const needsOldOrder = Boolean(body.status) || body.shipping_fee !== undefined;
  const { data: oldOrder } = needsOldOrder
    ? await supabase
        .from("orders")
        .select(
          "status, paid_at, cancelled_at, cancelled_note, delivering_at, delivered_at, refunded_at, returning_at, deposit_paid_at, payment_type, shipping_fee, total_price, deposit_amount, remaining_amount"
        )
        .eq("id", id)
        .single()
    : { data: null };

  // Status the order is leaving, captured before the write below overwrites it.
  const previousStatus = (oldOrder?.status ?? null) as string | null;

  // ── Courier delivery fee ────────────────────────────────────────────────
  // Courier tiers (carrier_4h / delivery_service) are created
  // with a zero shipping_fee because the BE / Grab / Green SM rate is not
  // knowable at checkout. Staff enter the real amount here once the parcel is
  // booked; total_price and remaining_amount move by the same delta so the
  // customer is not charged for a fee nobody quoted.
  const shippingFeeRequested = body.shipping_fee !== undefined;
  let shippingFeeChanged = false;

  if (shippingFeeRequested) {
    if (!oldOrder) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    // A settled order must keep the total it was paid against — changing the
    // fee would silently rewrite history and skew revenue reporting.
    if (oldOrder.status === "cancelled" || oldOrder.status === "refunded") {
      return NextResponse.json(
        {
          error: `Cannot edit the delivery fee of a ${oldOrder.status} order`,
        },
        { status: 400 }
      );
    }

    const rawFee = Number(body.shipping_fee);
    if (!Number.isFinite(rawFee) || rawFee < 0) {
      return NextResponse.json(
        { error: "shipping_fee must be a non-negative number" },
        { status: 400 }
      );
    }

    const oldFee = Number(oldOrder.shipping_fee ?? 0);
    const nextFee = Math.min(Math.round(rawFee), MAX_COURIER_SHIPPING_FEE);
    if (nextFee !== oldFee) {
      const delta = nextFee - oldFee;
      shippingFeeChanged = true;
      update.shipping_fee = nextFee;
      // Checkout charged the quoted total against this fee, so adjusting the
      // fee has to move the total by exactly the same amount.
      update.total_price = Number(oldOrder.total_price ?? 0) + delta;
      // Deposit is a percentage of the item subtotal, not of the total, so it
      // is unaffected by a delivery-fee change — only the balance moves.
      if (oldOrder.remaining_amount !== null) {
        update.remaining_amount = Math.max(
          0,
          update.total_price - Number(oldOrder.deposit_amount ?? 0)
        );
      }
    }
  }

  // Restore stock BEFORE updating status — the restoreOrderStock guard
  // checks current status to prevent double-restore; it must see the OLD
  // status (not yet "cancelled"/"refunded") to proceed.
  if (body.status === "cancelled" || body.status === "refunded") {
    try {
      await restoreOrderStock(id);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      console.error(
        `[orderService] Failed to restore stock for order ${id}: ${msg}`
      );
      return NextResponse.json({ success: true, stockWarning: msg });
    }
  }

  const { error } = await supabase.from("orders").update(update).eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Email provider temporarily unavailable; order status changes still save.

  // ── Notify the customer when the shipping picture changes ───────────────
  // Courier tiers are ordered unquoted, so this email is how the customer finds
  // out what they now owe. One combined email covers a fee change, a tracking
  // number, or both — a fee edit and a tracking save in the same PATCH must not
  // produce two mails. Purely informational: the order is already saved, and a
  // Resend outage must not surface as a failed update to the operator.
  // TODO(email): restore customer shipping notification when a replacement
  // provider is configured. Shipping data still saves normally.

  // Log audit event
  if (body.status && oldOrder) {
    const newData: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(
      update as Record<string, unknown>
    )) {
      if (val !== undefined) newData[key] = val;
    }
    void logAuditEvent(
      {
        action: "order.update_status",
        entity_type: "orders",
        entity_id: id,
        old_data: oldOrder as unknown as Record<string, unknown>,
        new_data: newData,
      },
      supabase
    );
  } else if (shippingFeeChanged && oldOrder) {
    // Fee-only edit — no status transition, so it gets its own audit action.
    void logAuditEvent(
      {
        action: "order.update_shipping_fee",
        entity_type: "orders",
        entity_id: id,
        old_data: oldOrder as unknown as Record<string, unknown>,
        new_data: update as unknown as Record<string, unknown>,
      },
      supabase
    );
  }

  // Generate invoice once it's fully paid; on "delivered" regenerate it with
  // the balance settled (fire-and-forget).
  if (body.status === "delivered") {
    void regenerateSettledInvoice(id);
  } else if (body.status === "confirmed" || body.status === "second_paid") {
    void (async () => {
      try {
        const { data: order } = await supabase
          .from("orders")
          .select(
            "order_number, status, payment_type, shipping_fee, shipping_discount_amount, voucher_discount_amount, delivery_address, shipping_method_id, total_price, deposit_percentage, deposit_amount, remaining_amount"
          )
          .eq("id", id)
          .single();

        if (order && order.delivery_address) {
          const items = await fetchInvoiceItems(id);
          const addr = order.delivery_address as Record<string, string | null>;
          const customerName = [addr.full_name, addr.phone_number]
            .filter(Boolean)
            .join(" - ");

          await generateAndStoreInvoice(
            id,
            buildInvoiceInput(order as InvoiceOrderRow, {
              customerName: customerName || "Khách hàng",
              items,
            })
          );
        }
      } catch (invoiceErr) {
        console.error(
          `[orders] failed to generate invoice for order ${id}:`,
          invoiceErr
        );
      }
    })();
  }

  // Trigger gacha missions whenever order status changes (fire-and-forget)
  if (body.status) {
    void (async () => {
      try {
        const { data: orderRow } = await supabase
          .from("orders")
          .select("user_id, total_price")
          .eq("id", id)
          .single();

        if (orderRow?.user_id) {
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
            const context: Record<string, unknown> = {
              order_status: body.status,
            };
            if (orderRow.total_price) {
              context.amount = Number(orderRow.total_price);
            }
            await Promise.all([
              (
                supabase.rpc as unknown as (
                  fn: string,
                  args: Record<string, unknown>
                ) => Promise<unknown>
              )("process_mission_progress", {
                p_user_id: orderRow.user_id,
                p_event_id: activeEvent.id,
                p_mission_type: "order_count",
                p_context: context,
              }),
              (
                supabase.rpc as unknown as (
                  fn: string,
                  args: Record<string, unknown>
                ) => Promise<unknown>
              )("process_mission_progress", {
                p_user_id: orderRow.user_id,
                p_event_id: activeEvent.id,
                p_mission_type: "spend_amount",
                p_context: context,
              }),
            ]);
          }
        }
      } catch (missionErr) {
        console.error(
          `[orders] failed to process missions for order ${id}:`,
          missionErr
        );
      }
    })();
  }

  // Compute rank when order is delivered (fire-and-forget)
  if (body.status === "delivered") {
    void handleRankUpdate(supabase, id);
  }

  // Invalidate storefront product caches so sold_count reflects the delivery
  if (body.status === "delivered") {
    await invalidateProductCaches();
  }

  // Order confirmation/cancellation/refund changes product availability/stock
  // (confirmed seals reserved stock; cancel/refund restores it). Invalidate so
  // /shop and product pages don't keep showing stale stock for the cache TTL.
  if (
    body.status === "confirmed" ||
    body.status === "first_paid" ||
    body.status === "second_paid" ||
    body.status === "cancelled" ||
    body.status === "refunded"
  ) {
    await invalidateProductCaches();
  }

  // Earn store points when order is marked as delivered (fire-and-forget)
  if (body.status === "delivered") {
    void (async () => {
      try {
        // Fetch the order's user and total price
        const { data: orderRow } = await supabase
          .from("orders")
          .select("user_id, total_price, order_number")
          .eq("id", id)
          .single();

        if (orderRow?.user_id && orderRow.total_price) {
          const { data: ptRows } = await (
            supabase.rpc as unknown as (
              fn: string,
              args: Record<string, unknown>
            ) => Promise<{ data: unknown; error: unknown }>
          )("compute_points_for_amount", {
            p_rule_type: "order_delivered",
            p_amount: Number(orderRow.total_price),
          });
          const points = Number(
            Array.isArray(ptRows)
              ? ptRows[0]?.compute_points_for_amount
              : ptRows
          );
          if (points > 0) {
            await (
              supabase.rpc as unknown as (
                fn: string,
                args: Record<string, unknown>
              ) => Promise<{ data: unknown; error: unknown }>
            )("earn_points", {
              p_user_id: orderRow.user_id,
              p_source_type: "order_delivered",
              p_source_ref: id,
              p_amount: points,
              p_note: `Order #${orderRow.order_number} delivered`,
            });
          }
        }
      } catch (pointsErr) {
        console.error(
          `[orders] failed to earn points for order ${id}:`,
          pointsErr
        );
      }
    })();
  }

  // Reverse NSP points earned on delivery when the order is refunded
  // (fire-and-forget). Idempotent via reverse_point_transactions RPC.
  if (body.status === "refunded") {
    void (async () => {
      try {
        const { data: orderRow } = await supabase
          .from("orders")
          .select("user_id, order_number")
          .eq("id", id)
          .single();

        if (!orderRow?.user_id) return;

        // Resolve the acting admin for the RPC audit guard.
        const authClient = await createServerClient();
        const {
          data: { user: adminUser },
        } = await authClient.auth.getUser();
        if (!adminUser) return;

        await (
          supabase.rpc as unknown as (
            fn: string,
            args: Record<string, unknown>
          ) => Promise<{ data: unknown; error: unknown }>
        )("reverse_point_transactions", {
          p_admin_id: adminUser.id,
          p_user_id: orderRow.user_id,
          p_source_ref: id,
          p_note: `Order #${orderRow.order_number} refunded`,
        });
      } catch (reverseErr) {
        console.error(
          `[orders] failed to reverse points for order ${id}:`,
          reverseErr
        );
      }
    })();
  }

  // Send push notification to customer on status changes (fire-and-forget)
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
    void (async () => {
      try {
        const { data: orderRow } = await supabase
          .from("orders")
          .select("user_id, order_number, total_price, cancelled_note")
          .eq("id", id)
          .single();

        if (!orderRow?.user_id || !orderRow?.order_number) return;

        let title = "";
        let nbody = "";
        const orderNum = orderRow.order_number;

        switch (body.status) {
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
          case "delivered": {
            title = `Đơn hàng ${orderNum} đã được giao hàng thành công`;
            let pointsStr = "";
            if (orderRow.total_price) {
              const { data: ptRows } = await (
                supabase.rpc as unknown as (
                  fn: string,
                  args: Record<string, unknown>
                ) => Promise<{ data: unknown; error: unknown }>
              )("compute_points_for_amount", {
                p_rule_type: "order_delivered",
                p_amount: Number(orderRow.total_price),
              });
              const points = Number(
                Array.isArray(ptRows)
                  ? (ptRows as Record<string, unknown>[])[0]
                      ?.compute_points_for_amount
                  : ptRows
              );
              if (points > 0) {
                pointsStr = ` ${points.toLocaleString("vi-VN")} điểm đã được cộng vào tài khoản.`;
              }
            }
            nbody = `Đơn hàng ${orderNum} đã được giao đến bạn.${pointsStr} Cảm ơn bạn đã tin tưởng và mua hàng ở NoobStore`;
            break;
          }
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
            deep_link: `/profile/orders/${id}`,
          })
          .select("id")
          .single();

        if (!inserted) return;

        const { data: subs } = await supabase
          .from("push_subscriptions")
          .select("endpoint, p256dh, auth")
          .eq("user_id", orderRow.user_id)
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
              deepLink: `/profile/orders/${id}`,
              notificationId: inserted.id,
              icon: "/icon-192.png",
              badge: "/icon-192.png",
            },
          }),
        });
      } catch (pushErr) {
        console.error(
          `[orders] failed to send push notification for order ${id}:`,
          pushErr
        );
      }
    })();
  }

  return NextResponse.json({ success: true });
}
