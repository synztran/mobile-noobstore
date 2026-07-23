import { getAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import { notifyNewOrder } from "@/lib/telegram/telegram.service";
import type { AppliedVoucherSummary } from "@/types/voucher";
import { getCheckoutLimiter, getRateLimitKey } from "@/lib/redis/ratelimit";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export interface SubmitOrderRequestItem {
  product_id: string;
  variant_id?: string | null;
  product_name: string;
  thumbnail?: string | null;
  quantity: number;
  is_pre_order?: boolean;
  pre_order_config?: {
    estimate?: string;
    available_date?: string | null;
    notes?: string | null;
  } | null;
  components?: Array<{
    variant_id: string;
    variant_name: string;
    component_group: string;
    thumbnail: string | null;
    is_pre_order?: boolean;
    pre_order_config?: {
      estimate?: string;
      available_date?: string | null;
      notes?: string | null;
    } | null;
  }>;
}

export interface SubmitOrderRequest {
  cart_id: string;
  shipping_cost: number;
  payment_type?: "full" | "deposit_cod";
  deposit_percentage?: number;
  items: SubmitOrderRequestItem[];
  service_ids?: string[];
  shipping_method_id?: string | null;
  delivery_address?: {
    full_name: string;
    phone_number: string;
    street_address: string;
    apartment?: string | null;
    city: string;
    district?: string;
    ward?: string;
    district_code?: string;
    ward_code?: string;
    postal_code?: string | null;
    notes?: string | null;
  } | null;
  vouchers?: {
    voucher_id?: string | null;
    voucher_code?: string | null;
    voucher_discount_amount?: number;
    shipping_discount_amount?: number;
    voucher_snapshot?: AppliedVoucherSummary | null;
    gift_items_snapshot?: Array<{
      product_id: string;
      variant_id: string | null;
      quantity: number;
    }> | null;
  }[];
  rank_discount?: {
    discount_amount: number;
    free_shipping: boolean;
    rank_name: string;
  };
}

export interface SubmitOrderResponse {
  order_id: string;
  order_number: string;
  status: string;
}

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  return fallback;
}

function isValidUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value
  );
}

function toJson(value: unknown): Json | null {
  if (value === null || typeof value === "undefined") {
    return null;
  }

  return JSON.parse(JSON.stringify(value)) as Json;
}

export async function POST(req: NextRequest) {
  try {
    const { success, reset } = await getCheckoutLimiter().limit(
      getRateLimitKey(req)
    );
    if (!success) {
      return NextResponse.json(
        { error: "Quá nhiều yêu cầu. Vui lòng thử lại sau." },
        {
          status: 429,
          headers: { "Retry-After": String(Math.ceil((reset - Date.now()) / 1000)) },
        }
      );
    }
  } catch (rateLimitError) {
    console.warn("[submit] rate limiter unavailable, allowing request:", rateLimitError);
  }

  try {
    const body: SubmitOrderRequest = await req.json();

    if (!body.items?.length) {
      return NextResponse.json(
        { error: "items are required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const admin = getAdminClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const productIds = [...new Set(body.items.map((i) => i.product_id))];
    const itemVariantIds = body.items
      .filter((i) => i.variant_id)
      .map((i) => i.variant_id!);
    const componentVariantIds = body.items
      .flatMap((i) => i.components ?? [])
      .map((c) => c.variant_id);
    const allVariantIds = [
      ...new Set([...itemVariantIds, ...componentVariantIds]),
    ];

    const [
      { data: productRows, error: productErr },
      { data: variantRows, error: variantErr },
    ] = await Promise.all([
      supabase.from("products").select("id, base_price").eq("is_active", true).in("id", productIds),
      allVariantIds.length > 0
        ? admin
            .from("product_variants")
            .select("id, price_adjustment")
            .in("id", allVariantIds)
        : Promise.resolve({
            data: [] as { id: string; price_adjustment: number }[],
            error: null,
          }),
    ]);

    if (productErr || variantErr) {
      return NextResponse.json(
        { error: "Failed to verify product prices" },
        { status: 500 }
      );
    }

    const productPriceMap = new Map<string, number>(
      (productRows ?? []).map((p) => [p.id, Number(p.base_price)])
    );
    const variantAdjMap = new Map<string, number>(
      (variantRows ?? []).map((v) => [v.id, Number(v.price_adjustment)])
    );

    const rpcItems = body.items.map((i) => {
      const basePrice = productPriceMap.get(i.product_id);
      if (basePrice === undefined) {
        throw new Error(`Product not found: ${i.product_id}`);
      }

      let unitPrice: number;
      if (i.variant_id) {
        unitPrice = basePrice + (variantAdjMap.get(i.variant_id) ?? 0);
      } else {
        const compAdj = (i.components ?? []).reduce(
          (sum, c) => sum + (variantAdjMap.get(c.variant_id) ?? 0),
          0
        );
        unitPrice = basePrice + compAdj;
      }

      return {
        product_id: i.product_id,
        product_name: i.product_name,
        unit_price: unitPrice,
        thumbnail: i.thumbnail ?? null,
        quantity: i.quantity,
        components:
          i.components?.map((c) => ({
            variant_id: c.variant_id,
            variant_name: c.variant_name,
            component_group: c.component_group,
            price_adjustment: variantAdjMap.get(c.variant_id) ?? 0,
            thumbnail: c.thumbnail,
            quantity: 1,
          })) ?? [],
      };
    });

    const MAX_SHIPPING_VND = 500_000;
    const safeShippingCost = Math.min(
      Math.max(0, Number(body.shipping_cost) || 0),
      MAX_SHIPPING_VND
    );
    const subtotal = rpcItems.reduce(
      (sum, i) => sum + i.unit_price * i.quantity,
      0
    );

    // ── Multi-voucher handling ────────────────────────────────────────
    const appliedVouchers = (body.vouchers ?? []).filter(
      (v) =>
        Boolean(v.voucher_id) ||
        Boolean(v.voucher_code) ||
        toNumber(v.voucher_discount_amount, 0) > 0 ||
        toNumber(v.shipping_discount_amount, 0) > 0
    );

    const totalRequestedDiscount = appliedVouchers.reduce(
      (sum, v) => sum + toNumber(v.voucher_discount_amount, 0),
      0
    );
    const totalRequestedShippingDiscount = appliedVouchers.reduce(
      (sum, v) => sum + toNumber(v.shipping_discount_amount, 0),
      0
    );

    const safeVoucherDiscount = Math.min(
      Math.max(0, totalRequestedDiscount),
      subtotal
    );
    const safeShippingDiscount = Math.min(
      Math.max(0, totalRequestedShippingDiscount),
      safeShippingCost
    );

    // ── Rank-based discount ────────────────────────────────────────────
    const requestedRankDiscount = toNumber(body.rank_discount?.discount_amount, 0);
    const safeRankDiscount = Math.min(Math.max(0, requestedRankDiscount), subtotal - safeVoucherDiscount);
    const safeRankShipping = body.rank_discount?.free_shipping ? Math.min(safeShippingCost - safeShippingDiscount, safeShippingCost) : 0;

    const recalculatedTotal = Math.max(
      0,
      subtotal + safeShippingCost - safeVoucherDiscount - safeShippingDiscount - safeRankDiscount - safeRankShipping
    );

    const orderId = crypto.randomUUID();
    const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const { data, error } = await (
      admin.rpc as unknown as (
        fn: string,
        args: Record<string, unknown>
      ) => Promise<{ data: unknown; error: { message: string } | null }>
    )("submit_order", {
      p_order_id: orderId,
      p_user_id: user?.id ?? null,
      p_order_number: orderNumber,
      p_total_price: recalculatedTotal,
      p_shipping_cost: safeShippingCost,
      p_items: rpcItems,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const result = data as {
      order_id: string;
      order_number: string;
      status: string;
    };

    // ── Persist multi-voucher fields on order ──────────────────────────
    if (appliedVouchers.length > 0) {
      const primaryVoucher = appliedVouchers[0];
      const allSnapshots = appliedVouchers
        .map((v) => v.voucher_snapshot)
        .filter(Boolean) as AppliedVoucherSummary[];
      const allGiftItems = appliedVouchers.flatMap(
        (v) => v.gift_items_snapshot ?? []
      );

      const orderVoucherUpdate = {
        voucher_id: primaryVoucher?.voucher_id ?? null,
        voucher_code: primaryVoucher?.voucher_code ?? null,
        voucher_discount_amount: safeVoucherDiscount,
        shipping_discount_amount: safeShippingDiscount,
        voucher_snapshot: allSnapshots.length > 0 ? toJson(allSnapshots) : null,
        gift_items_snapshot: allGiftItems.length > 0 ? toJson(allGiftItems) : null,
      };

      const { error: updateOrderError } = await supabase
        .from("orders")
        .update(orderVoucherUpdate)
        .eq("id", result.order_id);

      let voucherPersisted = !updateOrderError;
      if (updateOrderError) {
        const { error: adminUpdateOrderError } = await admin
          .from("orders")
          .update(orderVoucherUpdate)
          .eq("id", result.order_id);

        if (adminUpdateOrderError) {
          voucherPersisted = false;
          console.error(
            "[submit] failed to persist voucher fields (user+admin):",
            { updateOrderError, adminUpdateOrderError }
          );
        } else {
          voucherPersisted = true;
        }
      }

      // Increment usage count for EACH applied voucher
      if (voucherPersisted) {
        for (const v of appliedVouchers) {
          if (v.voucher_id) {
            const { error: incrementUsageError } = await (
              admin.rpc as unknown as (
                fn: string,
                args: Record<string, unknown>
              ) => Promise<{
                data: unknown;
                error: { message: string } | null;
              }>
            )("increment_voucher_used_count", {
              p_voucher_id: v.voucher_id,
            });

            if (incrementUsageError) {
              console.error(
                `[submit] failed to increment voucher used_count for ${v.voucher_id}:`,
                incrementUsageError
              );
            }
          }
        }
      }
    }

    // ── Persist delivery address + shipping method ────────────────────────
    if (body.delivery_address || body.shipping_method_id) {
      const now = new Date();
      let expectedDeliveryAt: string | null = null;

      // If any item is pre-order, use the earliest available_date
      const preOrderDates = body.items
        .flatMap((i) => {
          const dates: string[] = [];
          if (i.is_pre_order && i.pre_order_config?.available_date) {
            dates.push(i.pre_order_config.available_date);
          }
          for (const c of i.components ?? []) {
            if (c.is_pre_order && c.pre_order_config?.available_date) {
              dates.push(c.pre_order_config.available_date);
            }
          }
          return dates;
        })
        .filter(Boolean)
        .sort();

      if (preOrderDates.length > 0) {
        expectedDeliveryAt = new Date(preOrderDates[0]).toISOString();
      } else if (body.shipping_method_id === "express") {
        expectedDeliveryAt = new Date(
          now.getTime() + 4 * 60 * 60 * 1000
        ).toISOString();
      } else if (body.shipping_method_id === "standard") {
        expectedDeliveryAt = new Date(
          now.getTime() + 24 * 60 * 60 * 1000
        ).toISOString();
      }

      await supabase
        .from("orders")
        .update({
          delivery_address: body.delivery_address
            ? (body.delivery_address as unknown as Json)
            : null,
          shipping_method_id: body.shipping_method_id ?? null,
          expected_delivery_at: expectedDeliveryAt,
        })
        .eq("id", result.order_id);
    }

    // ── Persist deposit/cod payment fields ─────────────────────────────
    if (body.payment_type === "deposit_cod") {
      const pct = Math.min(80, Math.max(10, Math.round(body.deposit_percentage ?? 50)));
      const depositBase = subtotal;
      const depositAmt = Math.round(depositBase * pct / 100);
      const remainingAmt = Math.max(0, recalculatedTotal - depositAmt);

      const depositUpdatePayload = {
        payment_type: "deposit_cod",
        deposit_percentage: pct,
        deposit_amount: depositAmt,
        remaining_amount: remainingAmt,
      } as Record<string, unknown>;
      const { error: depositUpdateError } = await supabase
        .from("orders")
        .update(depositUpdatePayload as never)
        .eq("id", result.order_id);

      if (depositUpdateError) {
        const { error: adminDepositError } = await admin
          .from("orders")
          .update(depositUpdatePayload as never)
          .eq("id", result.order_id);

        if (adminDepositError) {
          console.error("[submit] failed to persist deposit fields:", adminDepositError);
        }
      }
    }

    // ── Persist gift items as order_items ─────────────────────────────────
    const allGiftItems = appliedVouchers.flatMap(
      (v) => v.gift_items_snapshot ?? []
    );
    if (allGiftItems.length > 0) {
      const giftProductIds = [...new Set(allGiftItems.map((g) => g.product_id))];
      const { data: giftProducts } = await admin
        .from("products")
        .select("id, name, thumbnail")
        .in("id", giftProductIds);

      const giftProductMap = new Map(
        (giftProducts ?? []).map((p) => [p.id, p])
      );

      const giftOrderItems = allGiftItems.map((gift, idx) => ({
        id: `${result.order_id}-gift-${idx}`,
        order_id: result.order_id,
        product_id: gift.product_id,
        product_name: giftProductMap.get(gift.product_id)?.name ?? "Quà tặng",
        thumbnail: giftProductMap.get(gift.product_id)?.thumbnail ?? null,
        quantity: gift.quantity,
        unit_price: 0,
      }));

      const { error: giftInsertError } = await supabase
        .from("order_items")
        .insert(giftOrderItems);

      if (giftInsertError) {
        console.error("[submit] failed to insert gift items:", giftInsertError);
      }
    }

    // ── Optional: attach services ─────────────────────────────────────────
    if (body.service_ids?.length) {
      const { data: services } = await supabase
        .from("services")
        .select("id, base_price")
        .in("id", body.service_ids);

      if (services?.length) {
        const orderServices = services.map((s, idx) => ({
          id: `${result.order_id}-svc-${idx}`,
          order_id: result.order_id,
          service_id: s.id,
          price: Number(s.base_price),
        }));
        await supabase.from("order_services").insert(orderServices);
      }
    }

    // Send Telegram notification
    const customerName =
      user?.user_metadata?.full_name ?? user?.email ?? "Khách";
    const itemCount = body.items.reduce((sum, i) => sum + i.quantity, 0);
    void notifyNewOrder(
      result.order_number,
      customerName,
      recalculatedTotal,
      undefined,
      itemCount,
      body.vouchers
    ).catch((notifyError) => {
      console.error(
        "[submit] failed to send order Telegram notification:",
        notifyError
      );
    });

    // ── Mark old cart as converted (keeps data for admin analytics) ──────
    if (body.cart_id) {
      await admin.from("carts").update({ status: "converted" }).eq("id", body.cart_id);
    }

    // ── Create a fresh active cart for the customer ──────────────────────
    if (user) {
      const newCartId = crypto.randomUUID();
      await admin.from("carts").insert({ id: newCartId, user_id: user.id, status: "active" });
    }

    // ── Gacha mission progress (fire-and-forget) ─────────────────────────
    if (user) {
      void (async () => {
        try {
          const { triggerMissionServer } = await import("@/lib/gacha/missions");

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
            await Promise.all([
              triggerMissionServer(
                supabase,
                user.id,
                activeEvent.id,
                "spend_amount",
                { amount: recalculatedTotal, order_status: "pending" }
              ),
              triggerMissionServer(
                supabase,
                user.id,
                activeEvent.id,
                "order_count",
                { order_status: "pending" }
              ),
            ]);
          }
        } catch (missionErr) {
          console.error(
            "[submit] failed to process gacha missions:",
            missionErr
          );
        }
      })();
    }

    return NextResponse.json({
      order_id: result.order_id,
      order_number: result.order_number,
      status: result.status,
    } satisfies SubmitOrderResponse);
  } catch (err: unknown) {
    const msg =
      err instanceof Error ? err.message : "Internal server error";
    console.error("[submit] unexpected error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
