import { getActiveCartId } from "@/modules/cart/server/service";
import { getAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import { resolveVariantOwners } from "@/lib/voucher-scope";
import {
  computeVoucherDiscount,
  isShippingReward,
} from "@/lib/voucher-discount";
import { notifyNewOrder } from "@/lib/telegram/telegram.service";
import { paymentDetailsForOrder } from "@/modules/payments/server/details";
import {
  issueEvidence,
  deliverEvidence,
} from "@/modules/payments/server/evidence";
import { after } from "next/server";
import { randomBase36 } from "@/lib/random";
import type {
  AppliedVoucherSummary,
  VoucherRewardType,
  VoucherScopeType,
} from "@/types/voucher";
import { getCheckoutLimiter, getRateLimitKey } from "@/lib/redis/ratelimit";
import { getMaxVouchersPerOrder } from "@/lib/vouchers/config";
import { canUseDeposit, clampDepositPercentage } from "@/lib/deposit";
import { invalidateProductCaches } from "@/lib/redis/cache";
import {
  ShippingMethod,
  isFeePendingShippingMethod,
  isPickupShippingMethod,
  normalizeShippingMethodId,
  sameShippingMethod,
} from "@/lib/shipping-method";
import { getCarrierShippingTier } from "@/lib/carrier-shipping";
import {
  findDisallowedComponentVariant,
  kitPriceOverrides,
  resolveKitUnitPrice,
  rulesByKitProduct,
} from "@/modules/products/kit-pricing";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

import type { RuleRow } from "@/modules/products/kit-pricing";

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
  /**
   * Advisory only — the cart to convert is resolved server-side from the
   * session (see the conversion block below). The client sends whatever its
   * persisted cart store holds, so this is null or stale on a cold load; the
   * route only logs a warning when it disagrees with the active cart.
   */
  cart_id?: string | null;
  shipping_cost: number;
  payment_type?: "full" | "deposit_cod";
  deposit_percentage?: number;
  items: SubmitOrderRequestItem[];
  service_ids?: string[];
  shipping_method_id?: string | null;
  pickup_at?: string | null;
  delivery_address?: {
    full_name: string;
    phone_number: string;
    street_address?: string;
    apartment?: string | null;
    city?: string;
    district?: string;
    ward?: string;
    // Nullable: the summary page sends `|| null` for codes the customer never
    // filled in, and the value is persisted as-is.
    district_code?: string | null;
    ward_code?: string | null;
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
    isShippingReward?: boolean;
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
          headers: {
            "Retry-After": String(Math.ceil((reset - Date.now()) / 1000)),
          },
        }
      );
    }
  } catch (rateLimitError) {
    console.warn(
      "[submit] rate limiter unavailable, allowing request:",
      rateLimitError
    );
  }

  try {
    const body: SubmitOrderRequest = await req.json();

    const shippingMethodId = normalizeShippingMethodId(body.shipping_method_id);

    if (!body.items?.length) {
      return NextResponse.json(
        { error: "items are required" },
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
        { error: "pickup_at is required for store pickup" },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const admin = getAdminClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Checkout requires an authenticated account — the /checkout page is already
    // auth-gated by middleware, so align the API and prevent anonymous orders.
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
    for (const item of body.items) {
      const rules = rulesByKit.get(item.product_id);
      if (!rules?.length) continue;

      // Every component variant must be a real variant. An unknown id would
      // otherwise price at 0 (no adjustment found) while still being counted.
      const unknownComponent = (item.components ?? []).find(
        (c) => !variantAdjMap.has(c.variant_id)
      );
      if (unknownComponent) {
        return NextResponse.json(
          {
            error: "Cấu hình sản phẩm không hợp lệ.",
            unknown_variant_id: unknownComponent.variant_id,
          },
          { status: 400 }
        );
      }

      // A rule's condition can be the kit's own variant OR one of its
      // component variants — every rule in the live catalogue is authored the
      // second way (e.g. YOK Switches keys off the "Purple" variant of its
      // Version component). So both go into the candidate set.
      const conditionVariantIds = [
        ...(item.variant_id ? [item.variant_id] : []),
        ...(item.components ?? []).map((c) => c.variant_id),
      ];

      const offending = findDisallowedComponentVariant(
        rules,
        conditionVariantIds,
        (item.components ?? []).map((c) => ({
          variant_id: c.variant_id,
          product_id: variantProductMap.get(c.variant_id) ?? null,
        }))
      );
      if (offending) {
        return NextResponse.json(
          {
            error:
              "Tùy chọn không tương thích với phiên bản đã chọn. Vui lòng chọn lại cấu hình.",
            incompatible_variant_id: offending,
          },
          { status: 400 }
        );
      }
    }
    const rpcItems = body.items.map((i) => {
      const basePrice = productPriceMap.get(i.product_id);
      if (basePrice === undefined) {
        throw new Error(`Product not found: ${i.product_id}`);
      }

      // One rule for every line: base + the kit's own variant + components, with
      // a per-pairing override replacing the component's own adjustment. This
      // used to be an if/else, so a kit carrying a variant dropped its
      // components from the price entirely.
      const rules = rulesByKit.get(i.product_id) ?? [];
      const priced = resolveKitUnitPrice({
        basePrice,
        kitVariant: i.variant_id
          ? { price_adjustment: variantAdjMap.get(i.variant_id) ?? 0 }
          : null,
        components: (i.components ?? []).map((c) => ({
          variant_id: c.variant_id,
          price_adjustment: variantAdjMap.get(c.variant_id) ?? 0,
        })),
        overrides: kitPriceOverrides(rules, [
          ...(i.variant_id ? [i.variant_id] : []),
          ...(i.components ?? []).map((c) => c.variant_id),
        ]),
      });
      const contributionByVariant = new Map(
        priced.contributions.map((c) => [c.variant_id, c.price_adjustment])
      );

      return {
        product_id: i.product_id,
        variant_id: i.variant_id ?? null,
        product_name: i.product_name,
        unit_price: priced.unitPrice,
        thumbnail: i.thumbnail ?? null,
        quantity: i.quantity,
        components:
          i.components?.map((c) => ({
            variant_id: c.variant_id,
            variant_name: c.variant_name,
            component_group: c.component_group,
            // Snapshot the RESOLVED contribution (override when one applies), not
            // the raw adjustment, so the order reflects what was charged.
            price_adjustment:
              contributionByVariant.get(c.variant_id) ??
              variantAdjMap.get(c.variant_id) ??
              0,
            thumbnail: c.thumbnail,
            quantity: 1,
          })) ?? [],
      };
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
    const maxVouchers = await getMaxVouchersPerOrder();
    if (uniqueVoucherIdsRequested.length > maxVouchers) {
      return NextResponse.json(
        { error: `At most ${maxVouchers} vouchers may be used per order.` },
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
    if (appliedVouchers.some((voucher) => !voucher.voucher_id)) {
      return NextResponse.json(
        { error: "Voucher could not be verified. Please re-apply it." },
        { status: 400 }
      );
    }
    if (appliedVoucherIdsUnique.length > 0) {
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

        const itemsForScope = body.items.map((i) => ({
          product_id: i.product_id,
          quantity: i.quantity,
          unit_price: Number(
            rpcItems.find((r) => r.product_id === i.product_id)?.unit_price ?? 0
          ),
          category_slug: slugByProductId.get(i.product_id) ?? null,
          variant_ids: [
            ...(i.variant_id ? [i.variant_id] : []),
            ...(i.components ?? []).map((c) => c.variant_id),
          ],
        }));

        // Add synthetic scope items for kit component owners so product/category
        // scoped vouchers can match them (base = owning product's line subtotal).
        const ownerLines = new Map<
          string,
          { unit_price: number; quantity: number }
        >();
        for (const item of body.items) {
          for (const vid of [
            item.variant_id,
            ...(item.components ?? []).map((c) => c.variant_id),
          ]) {
            const owner = vid ? ownerByVariant.get(vid) : undefined;
            if (!owner) continue;
            const lineSubtotal = Number(
              rpcItems.find((r) => r.product_id === item.product_id)
                ?.unit_price ?? 0
            );
            const qty = item.quantity;
            const existing = ownerLines.get(owner);
            if (existing) {
              existing.unit_price = Math.max(existing.unit_price, lineSubtotal);
              existing.quantity = Math.max(existing.quantity, qty);
            } else {
              ownerLines.set(owner, {
                unit_price: lineSubtotal,
                quantity: qty,
              });
            }
          }
        }
        for (const [owner, line] of ownerLines) {
          itemsForScope.push({
            product_id: owner,
            quantity: line.quantity,
            unit_price: line.unit_price,
            category_slug: slugByProductId.get(owner) ?? null,
            variant_ids: [],
          });
        }

        const now = new Date();
        const validIds = new Set<string>();
        const cappedDiscount = new Map<string, number>();
        const cappedShipping = new Map<string, number>();

        for (const v of voucherRows) {
          const row = v as unknown as {
            id: string;
            status: string;
            deleted_at: string | null;
            customer_ids: string[] | null;
            applies_to_shipping_methods: string[] | null;
            reward_type: string;
            scope_type: string;
            applies_to_product_ids: string[] | null;
            applies_to_category_slugs: string[] | null;
            excluded_product_ids: string[] | null;
            amount_off: number | null;
            percent_off: number | null;
            max_discount_amount: number | null;
            start_at: string | null;
            end_at: string | null;
            min_order_amount: number;
            usage_limit_total: number | null;
            usage_limit_per_user: number | null;
            used_count: number;
            stackable: boolean;
            gift_product_id: string | null;
            gift_variant_id: string | null;
            gift_quantity: number | null;
          };

          if (row.status !== "active" || row.deleted_at) continue;
          if (
            (row.start_at && new Date(row.start_at) > now) ||
            (row.end_at && new Date(row.end_at) < now)
          ) {
            continue;
          }
          if (
            row.usage_limit_total !== null &&
            row.used_count >= row.usage_limit_total
          )
            continue;
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
                  error: "Unable to validate voucher usage. Please try again.",
                },
                { status: 503 }
              );
            }
            if ((count ?? 0) >= row.usage_limit_per_user) continue;
          }
          if (row.customer_ids && row.customer_ids.length > 0) {
            if (!row.customer_ids.includes(user.id)) continue;
          }

          // Shipping-method restriction (empty list = unrestricted)
          const allowedMethods = row.applies_to_shipping_methods ?? [];
          if (allowedMethods.length > 0) {
            if (
              !shippingMethodId ||
              !allowedMethods.some((m) =>
                sameShippingMethod(m, shippingMethodId)
              )
            ) {
              continue;
            }
          }

          // Defense in depth: the apply route already rejects shipping vouchers
          // on fee-pending courier tiers, so this only matters if a client
          // hand-crafts the submitted voucher list. Without it such a voucher
          // would recompute to a 0đ saving and appear to apply for nothing.
          if (
            isShippingReward(row.reward_type as VoucherRewardType) &&
            isFeePendingShippingMethod(shippingMethodId)
          ) {
            continue;
          }

          // Scope match + subset base
          const excluded = new Set(row.excluded_product_ids ?? []);
          let base = subtotal;
          if (row.scope_type === "product") {
            const targets = new Set(row.applies_to_product_ids ?? []);
            const matching = itemsForScope.filter(
              (i) => targets.has(i.product_id) && !excluded.has(i.product_id)
            );
            if (matching.length === 0) continue;
            base = matching.reduce((s, i) => s + i.unit_price * i.quantity, 0);
          } else if (row.scope_type === "category") {
            const targets = new Set(row.applies_to_category_slugs ?? []);
            const matching = itemsForScope.filter(
              (i) =>
                targets.has(i.category_slug ?? "") &&
                !excluded.has(i.product_id)
            );
            if (matching.length === 0) continue;
            base = matching.reduce((s, i) => s + i.unit_price * i.quantity, 0);
          }
          if (row.min_order_amount > 0 && base < row.min_order_amount) continue;

          // Recompute discount against the eligible base. A shipping reward
          // type contributes to the shipping bucket, never the order total;
          // free_shipping always waives the full fee. Both come from the same
          // shared helper the apply/preview path uses, so the number the
          // customer saw and the number charged here cannot drift.
          const recomputed = computeVoucherDiscount(
            {
              reward_type: row.reward_type as VoucherRewardType,
              scope_type: row.scope_type as VoucherScopeType,
              amount_off: row.amount_off,
              percent_off: row.percent_off,
              max_discount_amount: row.max_discount_amount,
            },
            { orderBase: base, shippingCost: safeShippingCost }
          );

          validIds.add(row.id);
          cappedDiscount.set(row.id, recomputed.orderDiscount);
          cappedShipping.set(row.id, recomputed.shippingDiscount);
          const appliedVoucherExists = appliedVouchers.some(
            (candidate) => candidate.voucher_id === row.id
          );
          if (
            appliedVoucherExists &&
            row.reward_type === "gift_item" &&
            row.gift_product_id &&
            row.gift_quantity &&
            row.gift_quantity > 0
          ) {
            giftItemsByVoucherId.set(row.id, [
              {
                product_id: row.gift_product_id,
                variant_id: row.gift_variant_id,
                quantity: row.gift_quantity,
              },
            ]);
          }
        }

        // Strip ineligible vouchers, cap discounts at recomputed values
        const filtered = appliedVouchers.filter(
          (v) => v.voucher_id && validIds.has(v.voucher_id)
        );
        appliedVouchers.length = 0;
        appliedVouchers.push(
          ...filtered.map((v) => ({
            ...v,
            voucher_discount_amount: Math.min(
              toNumber(v.voucher_discount_amount, 0),
              cappedDiscount.get(v.voucher_id!) ?? 0
            ),
            shipping_discount_amount: Math.min(
              toNumber(v.shipping_discount_amount, 0),
              cappedShipping.get(v.voucher_id!) ?? 0
            ),
          }))
        );
      } else {
        // Fail closed: never create an order with unverified voucher benefits.
        return NextResponse.json(
          { error: "Unable to validate vouchers. Please try again." },
          { status: 503 }
        );
      }
      for (const voucher of appliedVouchers) {
        voucher.gift_items_snapshot = voucher.voucher_id
          ? (giftItemsByVoucherId.get(voucher.voucher_id) ?? null)
          : null;
      }
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
        { error: "Đơn hàng này không đủ điều kiện đặt cọc." },
        { status: 400 }
      );
    }

    const orderId = crypto.randomUUID();
    const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}-${randomBase36(4)}`;

    const submitOrderRpc = admin.rpc as unknown as (
      fn: string,
      args: Record<string, unknown>
    ) => Promise<{ data: unknown; error: { message: string } | null }>;
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
    const { data, error } =
      giftItems.length > 0
        ? await submitOrderRpc("submit_order_with_gifts", {
            ...submitOrderArgs,
            p_gift_items: giftItems,
          })
        : await submitOrderRpc("submit_order", submitOrderArgs);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // `submit_order` decremented stock in the DB — invalidate the product
    // cache so /shop and product pages don't serve stale stock for up to the
    // 600s TTL. Non-fatal: a cache-invalidation failure must not fail checkout.
    try {
      await invalidateProductCaches();
    } catch (cacheErr) {
      console.error("[submit] failed to invalidate product cache:", cacheErr);
    }

    const result = data as {
      order_id: string;
      order_number: string;
      status: string;
    };

    // ── Persist multi-voucher fields on order ──────────────────────────
    if (appliedVouchers.length > 0) {
      const primaryVoucher = appliedVouchers[0];
      const allGiftItems = appliedVouchers.flatMap((voucher) =>
        voucher.voucher_id
          ? (giftItemsByVoucherId.get(voucher.voucher_id) ?? [])
          : []
      );
      const allSnapshots = appliedVouchers
        .map((v) => v.voucher_snapshot)
        .filter(Boolean) as AppliedVoucherSummary[];

      const orderVoucherUpdate = {
        voucher_id: primaryVoucher?.voucher_id ?? null,
        voucher_code: primaryVoucher?.voucher_code ?? null,
        voucher_discount_amount: safeVoucherDiscount,
        shipping_discount_amount: safeShippingDiscount,
        voucher_snapshot: allSnapshots.length > 0 ? toJson(allSnapshots) : null,
        gift_items_snapshot:
          allGiftItems.length > 0 ? toJson(allGiftItems) : null,
      };

      // Orders UPDATE via admin client — user RLS UPDATE removed
      const { error: adminUpdateOrderError } = await admin
        .from("orders")
        .update(orderVoucherUpdate)
        .eq("id", result.order_id);

      const voucherPersisted = !adminUpdateOrderError;
      if (adminUpdateOrderError) {
        console.error(
          "[submit] failed to persist voucher fields:",
          adminUpdateOrderError
        );
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
        return NextResponse.json(
          { error: "Failed to save delivery details" },
          { status: 500 }
        );
      }
    }

    // ── Persist deposit/cod payment fields ─────────────────────────────
    // Eligibility was already enforced above (before the order row existed);
    // here we only clamp the percentage to the per-mode bounds and compute
    // the amounts. Deposit base stays the subtotal; remaining is the final
    // total minus the deposit.
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
    const msg = err instanceof Error ? err.message : "Internal server error";
    console.error("[submit] unexpected error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
