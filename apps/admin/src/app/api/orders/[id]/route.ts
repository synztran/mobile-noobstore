import { generateAndStoreInvoice } from "@/lib/invoice";
import { restoreOrderStock } from "@/lib/services/orderService";
import { getAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@db-types";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

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
			created_at, updated_at, cancelled_at, cancelled_note, paid_at, refunded_at, delivering_at, delivered_at,
			delivery_address, shipping_method_id, expected_delivery_at,
			user_id,
			users(id, first_name, last_name, email, phone_number),
			order_items(id, product_id, product_name, quantity, unit_price, thumbnail, order_item_components(id, component_group, variant_name, price_adjustment, product_variant_id, thumbnail, is_pre_order, pre_order_config)),
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
      .select("full_name, phone_number, address_line, ward_district, city")
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
      new Set(data.order_items.map((i: Record<string, unknown>) => i.product_id as string).filter(Boolean))
    ) as string[];
    const { data: giftRows } = await supabase
      .from("gift_products")
      .select("product_id, quantity, gift:gift_product_id!inner(name, thumbnail)")
      .in("product_id", productIds);

    if (giftRows) {
      const giftsByProductId: Record<string, Array<{ gift_name: string; gift_thumbnail: string | null; quantity: number }>> = {};
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

  return NextResponse.json({
    ...data,
    optionValueMap,
    shippingAddress,
    shippingMethodMap,
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = (await req.json()) as {
    status?: string;
    cancelled_note?: string;
  };

  const VALID_STATUSES = [
    "pending",
    "confirmed",
    "delivering",
    "delivered",
    "cancelled",
    "refunded",
  ];
  if (body.status && !VALID_STATUSES.includes(body.status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  type OrderUpdate = Database["public"]["Tables"]["orders"]["Update"];
  const update: OrderUpdate = {};
  if (body.status) update.status = body.status;
  if (body.status === "confirmed") {
    update.paid_at = new Date().toISOString();
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
  if (body.status === "delivered") {
    (update as Record<string, unknown>).delivered_at = new Date().toISOString();
  }

  const supabase = getAdminClient();

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

  // Generate invoice when order is confirmed (fire-and-forget)
  if (body.status === "confirmed") {
    void (async () => {
      try {
        const { data: order } = await supabase
          .from("orders")
          .select(
            "order_number, total_price, shipping_fee, shipping_discount_amount, voucher_discount_amount, delivery_address"
          )
          .eq("id", id)
          .single();

        const { data: items } = await supabase
          .from("order_items")
          .select("product_name, quantity, unit_price")
          .eq("order_id", id);

        if (order && items && order.delivery_address) {
          const addr = order.delivery_address as Record<string, string | null>;
          const customerName = [addr.full_name, addr.phone_number]
            .filter(Boolean)
            .join(" - ");
          const customerAddress = [
            addr.street_address,
            addr.apartment,
            addr.ward,
            addr.district,
            addr.city,
          ]
            .filter(Boolean)
            .join(", ");

          await generateAndStoreInvoice(id, {
            orderNumber: order.order_number,
            customerName: customerName || "Khách hàng",
            customerAddress: customerAddress || "",
            items: (items ?? []).map((i) => ({
              name: i.product_name,
              quantity: i.quantity,
              unit_cost: Number(i.unit_price),
            })),
            shippingFee: Number(order.shipping_fee ?? 0),
            discount:
              Number(order.shipping_discount_amount ?? 0) +
              Number(order.voucher_discount_amount ?? 0),
            total: Number(order.total_price),
          });
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

  // Send push notification to customer on status changes (fire-and-forget)
  if (
    body.status &&
    ["confirmed", "delivering", "delivered", "cancelled", "refunded"].includes(
      body.status
    )
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
