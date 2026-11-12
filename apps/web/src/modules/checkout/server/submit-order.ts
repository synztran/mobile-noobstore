import "server-only";
import { getActiveCartId } from "@/modules/cart/server/service";
import { getAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import { resolveVariantOwners } from "@/lib/voucher-scope";
import { notifyNewOrder } from "@/lib/telegram/telegram.service";
import { paymentDetailsForOrder } from "@/modules/payments/server/details";
import {
  issueEvidence,
  deliverEvidence,
} from "@/modules/payments/server/evidence";
import { after } from "next/server";
import { randomBase36 } from "@/lib/random";
import { createHash } from "node:crypto";
import type { AppliedVoucherSummary } from "@/types/voucher";
import { getMaxVouchersPerOrder } from "@/lib/vouchers/config";
import { canUseDeposit, clampDepositPercentage } from "@/lib/deposit";
import { invalidateProductCaches } from "@/lib/redis/cache";
import {
  ShippingMethod,
  isFeePendingShippingMethod,
  isPickupShippingMethod,
  normalizeShippingMethodId,
} from "@/lib/shipping-method";
import { getCarrierShippingTier } from "@/lib/carrier-shipping";
import {
  rulesByKitProduct,
  type RuleRow,
} from "@/modules/products/kit-pricing";
import type {
  SubmitOrderRequest,
  SubmitOrderResponse,
} from "@/modules/checkout/types";
import { NextRequest, NextResponse } from "next/server";
import {
  buildRpcItems,
  buildVoucherAdjustments,
  buildVoucherScopeItems,
  findIncompatibleComponent,
  toJson,
  toNumber,
  type VoucherValidationRow,
} from "./submit-order-logic";

const CHECKOUT_DIAGNOSTIC_CODES: Array<[RegExp, string]> = [
  [/operator does not exist: text = uuid/i, "CHECKOUT_SCHEMA_TYPE_MISMATCH"],
  [/Idempotency key reused/i, "CHECKOUT_IDEMPOTENCY_CONFLICT"],
  [/usage limit exceeded|Voucher unavailable/i, "CHECKOUT_VOUCHER_UNAVAILABLE"],
];

const CHECKOUT_ERROR_MESSAGES: Record<string, string> = {
  CHECKOUT_SCHEMA_TYPE_MISMATCH:
    "Checkout database schema mismatch. Please contact support with this error code.",
  CHECKOUT_GIFT_STOCK:
    "A gift item is no longer available. Update the voucher and try again.",
  CHECKOUT_IDEMPOTENCY_CONFLICT:
    "Checkout changed or a voucher is no longer available. Refresh and try again.",
  CHECKOUT_VOUCHER_UNAVAILABLE:
    "Checkout changed or a voucher is no longer available. Refresh and try again.",
  CHECKOUT_VOUCHER_LIMIT:
    "Checkout changed or a voucher is no longer available. Refresh and try again.",
  CHECKOUT_DATABASE_REJECTED:
    "Checkout could not be completed. Please contact support with this error code.",
};

function getCheckoutErrorCode(
  explicitCode: string | undefined,
  sqlPhase: string | undefined,
  diagnostic: string
) {
  if (explicitCode === "CHECKOUT_DATABASE_ERROR") {
    return sqlPhase
      ? `CHECKOUT_FAILED_${sqlPhase.toUpperCase()}`
      : "CHECKOUT_DATABASE_REJECTED";
  }
  if (explicitCode) return explicitCode;
  return CHECKOUT_DIAGNOSTIC_CODES.find(([pattern]) => pattern.test(diagnostic))?.[1]
    ?? "CHECKOUT_DATABASE_REJECTED";
}

function getCheckoutErrorMessage(code: string) {
  if (code.startsWith("CHECKOUT_FAILED_")) {
    const phase = code.slice("CHECKOUT_FAILED_".length).toLowerCase().replaceAll("_", " ");
    return `Checkout failed during ${phase}. Please share this code with support.`;
  }
  return CHECKOUT_ERROR_MESSAGES[code] ?? CHECKOUT_ERROR_MESSAGES.CHECKOUT_DATABASE_REJECTED;
}

export async function submitOrder(req: NextRequest) {
  let phase = "parse request";
  try {
    const body: SubmitOrderRequest = await req.json();

    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.idempotency_key ?? "")) {
      return NextResponse.json({ error: "Invalid checkout idempotency key" }, { status: 400 });
    }

    const shippingMethodId = normalizeShippingMethodId(body.shipping_method_id);

    if (!body.items?.length) {
      return NextResponse.json(
        { error_code: "CHECKOUT_INVALID_ITEMS" },
        { status: 400 }
      );
    }

    const hasPreOrder = body.items.some(
      (i) => i.is_pre_order || (i.components ?? []).some((c) => c.is_pre_order)
    );

    if (
      isPickupShippingMethod(shippingMethodId) &&
      !hasPreOrder &&
      (!body.pickup_at || Number.isNaN(new Date(body.pickup_at).getTime()))
    ) {
      return NextResponse.json(
        { error_code: "CHECKOUT_PICKUP_TIME_REQUIRED" },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const admin = getAdminClient();

    phase = "authenticate customer";
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Checkout requires an authenticated account — the /checkout page is already
    // auth-gated by middleware, so align the API and prevent anonymous orders.
    if (!user) {
      return NextResponse.json({ error_code: "CHECKOUT_UNAUTHORIZED" }, { status: 401 });
    }

    const replayQuery = await admin.rpc("get_checkout_idempotent_response", {
      p_user_id: user.id,
      p_idempotency_key: body.idempotency_key,
    });
    if (replayQuery.error) {
      const schemaMismatch = /operator does not exist: text = uuid/i.test(replayQuery.error.message);
      const code = schemaMismatch
        ? "CHECKOUT_SCHEMA_TYPE_MISMATCH"
        : "CHECKOUT_IDEMPOTENCY_LOOKUP_FAILED";
      console.error("[submit] checkout idempotency lookup failed", {
        code,
        postgresCode: replayQuery.error.code,
        message: replayQuery.error.message,
        details: replayQuery.error.details,
        hint: replayQuery.error.hint,
      });
      return NextResponse.json(
        {
          error: {
            code,
            message: schemaMismatch
              ? "Checkout database schema mismatch. Please contact support with this error code."
              : "Unable to verify checkout retry. Please contact support with this error code.",
            phase: "idempotency_lookup",
          },
        },
        { status: 500 }
      );
    }
    const storedReplay = replayQuery.data as {
      order_id?: string;
      order_number?: string;
      status?: string;
      request_hash?: string;
    } | null;

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

    phase = "load product prices and kit rules";
    const [
      { data: productRows, error: productErr },
      { data: variantRows, error: variantErr },
      { data: ruleRows },
    ] = await Promise.all([
      supabase
        .from("products")
        .select("id, base_price")
        .eq("is_active", true)
        .in("id", productIds),
      allVariantIds.length > 0
        ? admin
            .from("product_variants")
            // product_id is needed to match a component variant back to the rule
            // that restricts it (target_component_product_id).
            .select("id, product_id, price_adjustment")
            .in("id", allVariantIds)
        : Promise.resolve({
            data: [] as {
              id: string;
              product_id: string | null;
              price_adjustment: number;
            }[],
            error: null,
          }),
      productIds.length > 0
        ? admin
            .from("component_variant_rules")
            .select(
              `id, kit_product_id, condition_variant_id,
							 target_component_product_id,
							 component_variant_rule_allowed(variant_id, price_override)`
            )
            .in("kit_product_id", productIds)
        : Promise.resolve({ data: [] as unknown[], error: null }),
    ]);

    if (productErr || variantErr) {
      return NextResponse.json(
        { error_code: "CHECKOUT_PRICE_LOOKUP_FAILED" },
        { status: 500 }
      );
    }

    const productPriceMap = new Map<string, number>(
      (productRows ?? []).map((p) => [p.id, Number(p.base_price)])
    );

    // Dynamic Addon Deals Resolution for checkout
    if (productIds.length > 1) {
      const { data: addonDeals } = await (supabase as any)
        .from("product_addons")
        .select("main_product_id, addon_product_id, discount_type, discount_value")
        .in("main_product_id", productIds)
        .in("addon_product_id", productIds)
        .eq("is_active", true);

      const dealsByAddonId = new Map<string, any>(
        (addonDeals ?? [])
          .filter((deal: any) => productIds.includes(deal.main_product_id))
          .map((deal: any) => [deal.addon_product_id, deal])
      );
      for (const [addonProductId, deal] of dealsByAddonId) {
        const original = productPriceMap.get(addonProductId);
        if (original !== undefined) {
          const discount =
            deal.discount_type === "percentage"
              ? Math.round((original * Number(deal.discount_value)) / 100)
              : Math.min(original, Number(deal.discount_value));
          productPriceMap.set(addonProductId, Math.max(0, original - discount));
        }
      }
    }
    const variantAdjMap = new Map<string, number>(
      (variantRows ?? []).map((v) => [v.id, Number(v.price_adjustment)])
    );
    const variantProductMap = new Map<string, string | null>(
      (variantRows ?? []).map((v) => [
        v.id,
        (v.product_id ?? null) as string | null,
      ])
    );

    // The compatibility rules, including each allowed pair's price override.
    const rulesByKit = rulesByKitProduct(
      (ruleRows ?? []) as unknown as RuleRow[]
    );

    // ── Compatibility enforcement ───────────────────────────────────────────
    // Previously the rules were a pure UI affordance: the configurator greyed
    // out disallowed buttons, but nothing on the server checked them, so a
    // hand-crafted request could pair a kit variant with any component variant.
    // Reject before creating the order so an illegal pairing is never priced.
    phase = "validate kit compatibility and calculate prices";
    const incompatible = findIncompatibleComponent(
      body.items,
      rulesByKit,
      variantAdjMap,
      variantProductMap
    );
    if (incompatible?.kind === "unknown") {
      return NextResponse.json(
        {
          error_code: "CHECKOUT_INVALID_CONFIGURATION",
        },
        { status: 400 }
      );
    }
    if (incompatible?.kind === "incompatible") {
      return NextResponse.json(
        {
          error_code: "CHECKOUT_INCOMPATIBLE_CONFIGURATION",
        },
        { status: 400 }
      );
    }
    const rpcItems = buildRpcItems(body.items, {
      productPriceMap,
      variantAdjMap,
      variantProductMap,
      rulesByKit,
    });

    const MAX_SHIPPING_VND = 500_000;
    const clampShippingCost = (value: unknown) =>
      Math.min(Math.max(0, Number(value) || 0), MAX_SHIPPING_VND);

    // Every courier tier — the inter-city option and both in-city carrier speeds
    // — is fulfilled by a third-party courier whose rate is not known when the
    // customer checks out. Those orders are created with a zero fee; staff set
    // the real amount from admin /orders, which moves total_price and
    // remaining_amount. The distance-priced own-rider options still arrive from
    // the client (they depend on a geocoded route the server does not
    // recompute) and are clamped.
    let safeShippingCost: number;
    if (isFeePendingShippingMethod(shippingMethodId)) {
      safeShippingCost = 0;
    } else {
      safeShippingCost = clampShippingCost(body.shipping_cost);
    }

    const subtotal = rpcItems.reduce(
      (sum, i) => sum + i.unit_price * i.quantity,
      0
    );

    // ── Multi-voucher handling ────────────────────────────────────────
    phase = "validate vouchers and discounts";
    const appliedVouchers = (body.vouchers ?? []).filter(
      (v) =>
        Boolean(v.voucher_id) ||
        Boolean(v.voucher_code) ||
        toNumber(v.voucher_discount_amount, 0) > 0 ||
        toNumber(v.shipping_discount_amount, 0) > 0
    );
    const voucherIdsRequested = appliedVouchers
      .map((voucher) => voucher.voucher_id)
      .filter((id): id is string => Boolean(id));
    const uniqueVoucherIdsRequested = [...new Set(voucherIdsRequested)];
    phase = "load voucher checkout settings";
    const maxVouchers = await getMaxVouchersPerOrder();
    if (uniqueVoucherIdsRequested.length > maxVouchers) {
      return NextResponse.json(
        { error_code: "CHECKOUT_VOUCHER_LIMIT_EXCEEDED" },
        { status: 400 }
      );
    }
    // Gift identities/quantities are always derived from validated DB voucher
    // rows below; never trust the client's display snapshot for fulfillment.
    for (const voucher of appliedVouchers) {
      voucher.gift_items_snapshot = null;
    }
    const giftItemsByVoucherId = new Map<
      string,
      Array<{ product_id: string; variant_id: string | null; quantity: number }>
    >();

    const totalRequestedDiscount = appliedVouchers.reduce(
      (sum, v) => sum + toNumber(v.voucher_discount_amount, 0),
      0
    );
    const totalRequestedShippingDiscount = appliedVouchers.reduce(
      (sum, v) => sum + toNumber(v.shipping_discount_amount, 0),
      0
    );

    // ── Server-side voucher revalidation (security backstop) ──────────
    // Re-fetch the applied vouchers to verify status, customer targeting,
    // and scope eligibility against the actual cart items. Each voucher's
    // discount is capped at its matched-subset subtotal.
    const appliedVoucherIds = appliedVouchers
      .map((v) => v.voucher_id)
      .filter((id): id is string => Boolean(id));
    const appliedVoucherIdsUnique = [...new Set(appliedVoucherIds)];
    if (appliedVoucherIdsUnique.length > 0) {
      phase = "validate applied vouchers";
      const { data: voucherRows, error: voucherErr } = await supabase
        .from("vouchers")
        .select("*")
        .in("id", appliedVoucherIdsUnique);

      if (!voucherErr && voucherRows) {
        // Resolve kit component variant owners + category slugs for the
        // submitted items (authoritative scope pool).
        const ownerByVariant = await resolveVariantOwners(
          supabase,
          allVariantIds
        );
        const scopeProductIds = [
          ...new Set([...productIds, ...ownerByVariant.values()]),
        ];
        const { data: categoryRows } = await supabase
          .from("categories")
          .select("id, slug");
        const slugById = new Map(
          (categoryRows ?? []).map((c) => [c.id, c.slug])
        );
        const { data: productRows } = await supabase
          .from("products")
          .select("id, category_id")
          .in("id", scopeProductIds);
        const slugByProductId = new Map<string, string | undefined>();
        for (const p of productRows ?? []) {
          if (p.category_id) {
            slugByProductId.set(p.id, slugById.get(p.category_id));
          }
        }

        const itemsForScope = buildVoucherScopeItems({
          items: body.items,
          rpcItems,
          ownerByVariant,
          categorySlugByProductId: slugByProductId,
        });

        const usageCounts = new Map<string, number>();

        const validationRows = voucherRows as unknown as VoucherValidationRow[];
        for (const row of validationRows) {
          if (
            row.usage_limit_per_user !== null &&
            row.usage_limit_per_user > 0
          ) {
            const { count, error: usageError } = await supabase
              .from("orders")
              .select("id", { count: "exact", head: true })
              .eq("user_id", user.id)
              .eq("voucher_id", row.id);
            if (usageError) {
              return NextResponse.json(
                {
                  error_code: "CHECKOUT_VOUCHER_VALIDATION_FAILED",
                },
                { status: 503 }
              );
            }
            usageCounts.set(row.id, count ?? 0);
          }
        }

        const now = new Date();
        const adjustments = buildVoucherAdjustments({
          vouchers: appliedVouchers,
          voucherRows: validationRows,
          usageCounts,
          userId: user.id,
          shippingMethodId,
          now,
          scopeItems: itemsForScope,
          shippingCost: safeShippingCost,
        });
        for (const [id, value] of adjustments.gifts) {
          giftItemsByVoucherId.set(id, value);
        }

        // Strip ineligible vouchers, cap discounts at recomputed values
        appliedVouchers.length = 0;
        appliedVouchers.push(...adjustments.filteredVouchers);
      } else {
        // Fail closed: never create an order with unverified voucher benefits.
        return NextResponse.json(
          { error_code: "CHECKOUT_VOUCHER_VALIDATION_FAILED" },
          { status: 503 }
        );
      }
      for (const voucher of appliedVouchers) {
        voucher.gift_items_snapshot = voucher.voucher_id
          ? (giftItemsByVoucherId.get(voucher.voucher_id) ?? null)
          : null;
      }
    }
    if (appliedVouchers.some((voucher) => !voucher.voucher_id)) {
      return NextResponse.json(
        { error_code: "CHECKOUT_VOUCHER_INVALID" },
        { status: 400 }
      );
    }

    const totalRequestedDiscountSafe = appliedVouchers.reduce(
      (sum, v) => sum + toNumber(v.voucher_discount_amount, 0),
      0
    );
    const totalRequestedShippingDiscountSafe = appliedVouchers.reduce(
      (sum, v) => sum + toNumber(v.shipping_discount_amount, 0),
      0
    );

    const safeVoucherDiscount = Math.min(
      Math.max(0, totalRequestedDiscountSafe),
      subtotal
    );
    const safeShippingDiscount = Math.min(
      Math.max(0, totalRequestedShippingDiscountSafe),
      safeShippingCost
    );

    // ── Rank-based discount (server-authoritative) ────────────────────
    // Never trust body.rank_discount — recompute from the user's actual
    // rank to prevent discount fraud.
    let safeRankDiscount = 0;
    let safeRankShipping = 0;
    phase = "calculate rank discount and payment eligibility";
    const { data: userRankRow } = await admin
      .from("users")
      .select("rank_id")
      .eq("id", user.id)
      .maybeSingle();
    if (userRankRow?.rank_id) {
      const { data: rank } = await admin
        .from("customer_ranks")
        .select("benefits")
        .eq("id", userRankRow.rank_id)
        .maybeSingle();
      if (rank) {
        const b = (
          typeof rank.benefits === "string"
            ? JSON.parse(rank.benefits)
            : rank.benefits
        ) as Record<string, unknown>;
        const flags = (b.flags ?? {}) as Record<string, unknown>;
        if (flags.discount_percent_enabled) {
          const pct = toNumber(b.discount_percent, 0);
          safeRankDiscount = Math.min(
            Math.round((subtotal * pct) / 100),
            subtotal - safeVoucherDiscount
          );
        }
        if (flags.free_shipping_enabled && b.free_shipping) {
          safeRankShipping = Math.min(
            safeShippingCost - safeShippingDiscount,
            safeShippingCost
          );
        }
      }
    }

    const recalculatedTotal = Math.max(
      0,
      subtotal +
        safeShippingCost -
        safeVoucherDiscount -
        safeShippingDiscount -
        safeRankDiscount -
        safeRankShipping
    );

    // Deposit eligibility is checked before the order row exists so a
    // disallowed deposit never half-creates an order. The rules are shared
    // with the checkout UI via lib/deposit.ts.
    if (
      body.payment_type === "deposit_cod" &&
      !canUseDeposit({
        hasPreOrder,
        orderTotal: recalculatedTotal,
        isPickup: isPickupShippingMethod(shippingMethodId),
        isFeePending: isFeePendingShippingMethod(shippingMethodId),
      })
    ) {
      return NextResponse.json(
        { error_code: "CHECKOUT_DEPOSIT_UNAVAILABLE" },
        { status: 400 }
      );
    }

    const orderId = crypto.randomUUID();
    const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}-${randomBase36(4)}`;

    const allGiftItems = appliedVouchers.flatMap((voucher) =>
      voucher.voucher_id ? (giftItemsByVoucherId.get(voucher.voucher_id) ?? []) : []
    );
    const allSnapshots = appliedVouchers
      .map((v) => v.voucher_snapshot)
      .filter(Boolean) as AppliedVoucherSummary[];
    const idempotencyPayload = {
      user_id: user.id,
      items: rpcItems,
      shipping_cost: safeShippingCost,
      shipping_method_id: shippingMethodId,
      pickup_at: body.pickup_at ?? null,
      delivery_address: body.delivery_address ?? null,
      payment_type: body.payment_type ?? "full",
      deposit_percentage: body.deposit_percentage ?? null,
      vouchers: appliedVouchers.map((voucher) => ({
        ...voucher,
        voucher_snapshot: null,
        gift_items_snapshot: null,
      })),
      rank_discount: [safeRankDiscount, safeRankShipping],
      services: body.service_ids ?? [],
    };
    const requestHash = createHash("sha256")
      .update(JSON.stringify(idempotencyPayload))
      .digest("hex");

    if (storedReplay?.order_id && storedReplay.order_number) {
      if (storedReplay.request_hash !== requestHash) {
        return NextResponse.json(
          { error: "Checkout idempotency key reused with different payload" },
          { status: 409 }
        );
      }
      return NextResponse.json({
        order_id: storedReplay.order_id,
        order_number: storedReplay.order_number,
        status: storedReplay.status ?? "pending",
      } satisfies SubmitOrderResponse);
    }

    phase = "create order and reserve stock (database RPC)";
    const submitOrderRpc = admin.rpc.bind(admin) as unknown as (
      fn: string,
      args: Record<string, unknown>
    ) => Promise<{
      data: unknown;
      error: { code?: string; message: string; details?: string; hint?: string } | null;
    }>;
    const giftItems = appliedVouchers.flatMap((voucher) =>
      voucher.voucher_id
        ? (giftItemsByVoucherId.get(voucher.voucher_id) ?? [])
        : []
    );
    const submitOrderArgs = {
      p_order_id: orderId,
      p_user_id: user?.id ?? null,
      p_order_number: orderNumber,
      p_total_price: recalculatedTotal,
      p_shipping_cost: safeShippingCost,
      p_items: rpcItems,
    };
    const { data, error } = await submitOrderRpc("submit_order_with_checkout", {
      ...submitOrderArgs,
      p_gift_items: giftItems,
      p_idempotency_key: body.idempotency_key,
      p_request_hash: requestHash,
      p_vouchers: appliedVouchers.map((voucher) => ({
        voucher_id: voucher.voucher_id,
        voucher_code: voucher.voucher_code,
      })),
      p_voucher_discount_amount: safeVoucherDiscount,
      p_shipping_discount_amount: safeShippingDiscount,
      p_voucher_snapshot: allSnapshots.length ? toJson(allSnapshots) : null,
      p_gift_items_snapshot: allGiftItems.length ? toJson(allGiftItems) : null,
    });

    if (error) {
      const diagnostic = `${error.message} ${error.details ?? ""} ${error.hint ?? ""}`;
      const conflict = /Idempotency key reused|usage limit exceeded|Voucher unavailable|CHECKOUT_IDEMPOTENCY_CONFLICT|CHECKOUT_VOUCHER_LIMIT|CHECKOUT_VOUCHER_UNAVAILABLE/i.test(diagnostic);
      const explicitCode = /CHECKOUT_[A-Z_]+/.exec(diagnostic)?.[0];
      const sqlPhase = /during ([a-z_]+) \(sqlstate ([0-9a-z]+)\)/i.exec(diagnostic)?.[1]
        ?? /phase=([^;\s]+)/i.exec(diagnostic)?.[1];
      const code = getCheckoutErrorCode(explicitCode, sqlPhase, diagnostic);
      const message = getCheckoutErrorMessage(code);

      console.error("[submit] checkout database RPC failed", {
        phase,
        code,
        postgresCode: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
      const failedPhase = sqlPhase ?? "create_order";
      const responseMessage = code.startsWith("CHECKOUT_FAILED_")
        ? `Checkout failed during ${failedPhase.replaceAll("_", " ")}. Please share code ${code} with support.`
        : message;
      return NextResponse.json(
        { error: {
          code,
          message: responseMessage,
          phase: failedPhase,
          postgresCode: /SQLSTATE\s+([0-9A-Z]+)/i.exec(diagnostic)?.[1]?.toUpperCase(),
        } },
        { status: conflict ? 409 : 400 }
      );
    }

    // `submit_order` decremented stock in the DB — invalidate the product
    // cache so /shop and product pages don't serve stale stock for up to the
    // 600s TTL. Non-fatal: a cache-invalidation failure must not fail checkout.
    phase = "invalidate product caches";
    try {
      await invalidateProductCaches();
    } catch (cacheErr) {
      console.error("[submit] failed to invalidate product cache:", cacheErr);
    }

    const result = data as {
      order_id: string;
      order_number: string;
      status: string;
      replayed?: boolean;
    };

    if (result.replayed) {
      return NextResponse.json({
        order_id: result.order_id,
        order_number: result.order_number,
        status: result.status,
      } satisfies SubmitOrderResponse);
    }

    // ── Persist multi-voucher fields on order ──────────────────────────
    phase = "persist voucher details and usage";
    // Voucher snapshots and quota reservations committed atomically inside the
    // checkout RPC with stock and order rows.

    // ── Persist delivery address + shipping method ────────────────────────
    phase = "persist delivery and pickup details";
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

      // Speed commitment only — the carrier tiers carry an SLA window even
      // though they carry no price. Used for orders.expected_delivery_at.
      const carrierTier = getCarrierShippingTier(shippingMethodId);
      if (preOrderDates.length > 0) {
        expectedDeliveryAt = new Date(preOrderDates[0]).toISOString();
      } else if (carrierTier) {
        expectedDeliveryAt = new Date(
          now.getTime() + carrierTier.slaHours * 60 * 60 * 1000
        ).toISOString();
      } else if (shippingMethodId === ShippingMethod.Express) {
        expectedDeliveryAt = new Date(
          now.getTime() + 4 * 60 * 60 * 1000
        ).toISOString();
      } else if (shippingMethodId === ShippingMethod.Standard) {
        expectedDeliveryAt = new Date(
          now.getTime() + 24 * 60 * 60 * 1000
        ).toISOString();
      }

      // Delivery address via admin client — user RLS UPDATE removed
      const { error: addressError } = await admin
        .from("orders")
        .update({
          delivery_address: body.delivery_address
            ? (body.delivery_address as unknown as Json)
            : null,
          shipping_method_id: shippingMethodId,
          expected_delivery_at: isPickupShippingMethod(shippingMethodId)
            ? null
            : expectedDeliveryAt,
          pickup_at:
            isPickupShippingMethod(shippingMethodId) && body.pickup_at
              ? new Date(body.pickup_at).toISOString()
              : null,
        })
        .eq("id", result.order_id);

      // A foreign-key rejection here (e.g. a method missing from
      // shipping_methods) used to be swallowed, silently dropping the delivery
      // address and pickup slot for the order.
      if (addressError) {
        console.error(
          "[submit] failed to persist delivery details:",
          addressError
        );
        return NextResponse.json({ error_code: "CHECKOUT_DELIVERY_SAVE_FAILED" }, { status: 500 });
      }
    }

    // ── Persist deposit/cod payment fields ─────────────────────────────
    // Eligibility was already enforced above (before the order row existed);
    // here we only clamp the percentage to the per-mode bounds and compute
    // the amounts. Deposit base stays the subtotal; remaining is the final
    // total minus the deposit.
    phase = "persist deposit payment details";
    if (body.payment_type === "deposit_cod") {
      const pct = clampDepositPercentage(
        body.deposit_percentage,
        hasPreOrder,
        recalculatedTotal
      );
      const depositBase = subtotal;
      const depositAmt = Math.round((depositBase * pct) / 100);
      const remainingAmt = Math.max(0, recalculatedTotal - depositAmt);

      const depositUpdatePayload = {
        payment_type: "deposit_cod",
        deposit_percentage: pct,
        deposit_amount: depositAmt,
        remaining_amount: remainingAmt,
      } as Record<string, unknown>;
      // Deposit fields via admin client — user RLS UPDATE removed
      const { error: depositUpdateError } = await admin
        .from("orders")
        .update(depositUpdatePayload as never)
        .eq("id", result.order_id);

      if (depositUpdateError) {
        console.error(
          "[submit] failed to persist deposit fields:",
          depositUpdateError
        );
      }
    }

    // ── Persist gift items as order_items ─────────────────────────────────
    // Gift order items and stock reservation were committed atomically by
    // submit_order; do not insert them a second time here.

    // ── Optional: attach services ─────────────────────────────────────────
    phase = "attach optional services";
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
    phase = "send order notification and payment evidence";
    try {
      const { data: savedOrder, error: savedOrderError } = await admin
        .from("orders")
        .select("*")
        .eq("id", result.order_id)
        .single();
      if (savedOrderError || !savedOrder)
        throw new Error("Cannot load saved order for notification");
      const { data: shippingMethod } = savedOrder.shipping_method_id
        ? await admin
            .from("shipping_methods")
            .select("name")
            .eq("id", savedOrder.shipping_method_id)
            .maybeSingle()
        : { data: null };
      await notifyNewOrder(
        result.order_number,
        customerName,
        Number(savedOrder.total_price),
        undefined,
        itemCount,
        body.vouchers,
        {
          paymentType: savedOrder.payment_type,
          depositPercentage: Number(savedOrder.deposit_percentage ?? 0),
          depositAmount: Number(savedOrder.deposit_amount ?? 0),
          remainingAmount: Number(savedOrder.remaining_amount ?? 0),
          shippingMethodId: savedOrder.shipping_method_id,
          shippingMethodName: isPickupShippingMethod(
            savedOrder.shipping_method_id
          )
            ? "Nhận tại cửa hàng"
            : (shippingMethod?.name ??
              savedOrder.shipping_method_id ??
              "Chưa xác định"),
          address: savedOrder.delivery_address as Record<
            string,
            unknown
          > | null,
        }
      );
      after(async () => {
        try {
          const payment = await paymentDetailsForOrder(savedOrder);
          if (payment.payload && payment.data.bank) {
            const evidence = await issueEvidence(
              savedOrder.id,
              savedOrder.order_number,
              payment.data.amountDue,
              payment.data.bank,
              payment.payload
            );
            await deliverEvidence(evidence);
          }
        } catch {
          console.error(
            "[submit] payment evidence could not be issued",
            savedOrder.id
          );
        }
      });
    } catch (notifyError) {
      console.error(
        "[submit] failed to send order Telegram notification:",
        notifyError
      );
    }

    // ── Mark the cart as converted (keeps data for admin analytics) ───────
    // Resolved server-side from the session, never from body.cart_id. The
    // client value comes from the persisted cart store, so it is null or stale
    // whenever GET /api/cart has not resolved yet — and the old
    // `if (body.cart_id)` silently skipped the conversion, leaving the cart
    // active after a placed order (a retry then created a duplicate order).
    // Scoping by user_id also means a caller can no longer flip someone
    // else's active cart through the service-role client.
    phase = "convert active cart";
    const activeCartId = user ? await getActiveCartId(admin, user.id) : null;
    if (body.cart_id && body.cart_id !== activeCartId) {
      console.warn(
        `[submit] client cart_id ${body.cart_id} != active cart ${activeCartId} (order ${result.order_number}) — converted the server-resolved cart`
      );
    }
    if (activeCartId) {
      await admin
        .from("carts")
        .update({ status: "converted" })
        .eq("id", activeCartId)
        .eq("user_id", user!.id);
    }

    // NOTE: no fresh cart is pre-created here. The next add-to-cart lazily
    // creates it via getOrCreateCart, which retries on the
    // carts_one_active_per_user unique index (migration 135). Pre-inserting
    // here raced that lookup and was one of two ways users ended up with
    // several active carts — which made GET /api/cart return an empty cart.

    // ── Gacha mission progress ───────────────────────────────────────────
    phase = "process gacha mission progress";
    if (user) {
      try {
        const { triggerMissionServer } =
          await import("@/modules/gacha/server/missions");

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
            // process_mission_progress is service-role only (migration 131).
            triggerMissionServer(
              admin,
              user.id,
              activeEvent.id,
              "spend_amount",
              { amount: recalculatedTotal, order_status: "pending" }
            ),
            // process_mission_progress is service-role only (migration 131).
            triggerMissionServer(
              admin,
              user.id,
              activeEvent.id,
              "order_count",
              { order_status: "pending" }
            ),
          ]);
        }
      } catch (missionErr) {
        console.error("[submit] failed to process gacha missions:", missionErr);
      }
    }

    return NextResponse.json({
      order_id: result.order_id,
      order_number: result.order_number,
      status: result.status,
    } satisfies SubmitOrderResponse);
  } catch (err: unknown) {
    console.error("[submit] unexpected error:", {
      phase,
      message: err instanceof Error ? err.message : "Internal server error",
      stack: err instanceof Error ? err.stack : undefined,
    });
    return NextResponse.json({
      error: {
        code: "CHECKOUT_INTERNAL_ERROR",
        message: "Checkout could not be completed. Please contact support with this error code.",
        phase,
      },
    }, { status: 500 });
  }
}
