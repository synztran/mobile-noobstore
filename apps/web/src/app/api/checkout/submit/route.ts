import { getAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import { notifyNewOrder } from "@/lib/telegram/telegram.service";
import type { AppliedVoucherSummary } from "@/types/voucher";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export interface SubmitOrderRequestItem {
  product_id: string;
  /** Optional — present for standard products with a selected variant */
  variant_id?: string | null;
  product_name: string;
  thumbnail?: string | null;
  quantity: number;
  /** For kit items: the resolved component selections */
  components?: Array<{
    variant_id: string;
    variant_name: string;
    component_group: string;
    thumbnail: string | null;
  }>;
}

export interface SubmitOrderRequest {
  cart_id: string;
  /** Client-computed shipping cost — capped server-side to prevent manipulation */
  shipping_cost: number;
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
    ward_district?: string;
    postal_code?: string | null;
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

function toJson(value: unknown): Json | null {
  if (value === null || typeof value === "undefined") {
    return null;
  }

  return JSON.parse(JSON.stringify(value)) as Json;
}

export async function POST(req: NextRequest) {
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

    // ── Server-side price recalculation ──────────────────────────────────
    // NEVER trust unit_price or total_price from the client.
    // Fetch authoritative prices from the database.

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

    // Build the items payload with server-verified prices
    const rpcItems = body.items.map((i) => {
      const basePrice = productPriceMap.get(i.product_id);
      if (basePrice === undefined) {
        throw new Error(`Product not found: ${i.product_id}`);
      }

      let unitPrice: number;
      if (i.variant_id) {
        // Standard product with a selected variant
        unitPrice = basePrice + (variantAdjMap.get(i.variant_id) ?? 0);
      } else {
        // Kit product: base_price + sum of component price_adjustments from DB
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
        // Each component consumes 1 unit per kit ordered (quantity field)
        components:
          i.components?.map((c) => ({
            variant_id: c.variant_id,
            variant_name: c.variant_name,
            component_group: c.component_group,
            // Server-fetched price_adjustment, not client-supplied
            price_adjustment: variantAdjMap.get(c.variant_id) ?? 0,
            thumbnail: c.thumbnail,
            quantity: 1,
          })) ?? [],
      };
    });

    // Recalculate totals from server-verified item prices.
    // Clamp shipping_cost to a safe ceiling — it is client-computed due to
    // time/district surcharges, but we prevent unreasonable manipulation.
    const MAX_SHIPPING_VND = 500_000;
    const safeShippingCost = Math.min(
      Math.max(0, Number(body.shipping_cost) || 0),
      MAX_SHIPPING_VND
    );
    const subtotal = rpcItems.reduce(
      (sum, i) => sum + i.unit_price * i.quantity,
      0
    );

    const vouchers = body.vouchers ?? [];
    const appliedVouchers = vouchers.filter(
      (v) =>
        Boolean(v.voucher_id) ||
        Boolean(v.voucher_code) ||
        Boolean(v.voucher_snapshot) ||
        Boolean(v.gift_items_snapshot) ||
        toNumber(v.voucher_discount_amount, 0) > 0 ||
        toNumber(v.shipping_discount_amount, 0) > 0
    );
    const usedVoucherCount = appliedVouchers.length;
    const hasMultipleVouchers = usedVoucherCount > 1;

    if (hasMultipleVouchers) {
      return NextResponse.json(
        { error: "Only one voucher can be applied per order" },
        { status: 400 }
      );
    }

    const primaryVoucher = appliedVouchers[0] ?? vouchers[0];
    const requestedVoucherDiscount = toNumber(
      primaryVoucher?.voucher_discount_amount,
      0
    );
    const requestedShippingDiscount = toNumber(
      primaryVoucher?.shipping_discount_amount,
      0
    );

    const safeVoucherDiscount = Math.min(
      Math.max(0, requestedVoucherDiscount),
      subtotal
    );
    const safeShippingDiscount = Math.min(
      Math.max(0, requestedShippingDiscount),
      safeShippingCost
    );
    const recalculatedTotal = Math.max(
      0,
      subtotal + safeShippingCost - safeVoucherDiscount - safeShippingDiscount
    );

    // Generate IDs server-side so they're in the response even if the RPC
    // call is retried (idempotent on the same p_order_id).
    const orderId = crypto.randomUUID();
    const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    // ── Single atomic transaction: lock → validate → deduct → create order ──
    // submit_order uses SELECT … FOR UPDATE to prevent the race condition where
    // two concurrent checkouts both pass stock validation for the last unit.
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
      // RAISE EXCEPTION from the RPC surfaces here — includes OOS messages
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const result = data as {
      order_id: string;
      order_number: string;
      status: string;
    };

    // Persist voucher fields on order after atomic submit_order RPC insert.
    if (
      primaryVoucher?.voucher_id ||
      primaryVoucher?.voucher_code ||
      safeVoucherDiscount > 0 ||
      safeShippingDiscount > 0 ||
      primaryVoucher?.voucher_snapshot ||
      primaryVoucher?.gift_items_snapshot
    ) {
      const voucherSnapshotJson = toJson(primaryVoucher?.voucher_snapshot);
      const giftItemsSnapshotJson = toJson(primaryVoucher?.gift_items_snapshot);
      const orderVoucherUpdate = {
        voucher_id: primaryVoucher?.voucher_id ?? null,
        voucher_code: primaryVoucher?.voucher_code ?? null,
        voucher_discount_amount: safeVoucherDiscount,
        shipping_discount_amount: safeShippingDiscount,
        voucher_snapshot: voucherSnapshotJson,
        gift_items_snapshot: giftItemsSnapshotJson,
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

      if (voucherPersisted && primaryVoucher?.voucher_id) {
        const { error: incrementUsageError } = await (
          admin.rpc as unknown as (
            fn: string,
            args: Record<string, unknown>
          ) => Promise<{
            data: unknown;
            error: { message: string } | null;
          }>
        )("increment_voucher_used_count", {
          p_voucher_id: primaryVoucher.voucher_id,
        });

        if (incrementUsageError) {
          console.error(
            "[submit] failed to increment voucher used_count:",
            incrementUsageError
          );
        }
      }
    }

    // ── Persist delivery address + shipping method ────────────────────────
    if (body.delivery_address || body.shipping_method_id) {
      const now = new Date();
      let expectedDeliveryAt: string | null = null;
      if (body.shipping_method_id === "express") {
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
            ? (body.delivery_address as unknown as import("@/lib/supabase/database.types").Json)
            : null,
          shipping_method_id: body.shipping_method_id ?? null,
          expected_delivery_at: expectedDeliveryAt,
        })
        .eq("id", result.order_id);
    }

    // ── Persist gift items as order_items ─────────────────────────────────
    const giftItems = primaryVoucher?.gift_items_snapshot ?? [];
    if (giftItems.length > 0) {
      const giftProductIds = [...new Set(giftItems.map((g) => g.product_id))];
      const { data: giftProducts } = await admin
        .from("products")
        .select("id, name, thumbnail")
        .in("id", giftProductIds);

      const giftProductMap = new Map(
        (giftProducts ?? []).map((p) => [p.id, p])
      );

      const giftOrderItems = giftItems.map((gift, idx) => ({
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

    // Send Telegram notification without breaking checkout on failure
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

    // ── Gacha mission progress (fire-and-forget) ─────────────────────────
    // Only trigger missions for authenticated users.
    if (user) {
      void (async () => {
        try {
          const { triggerMissionServer } = await import("@/lib/gacha/missions");

          // Find the currently active gacha event
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
            // Trigger spend_amount and order_count missions in parallel
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
    console.error("[submit] unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
