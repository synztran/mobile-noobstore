import { VOUCHER_ERROR_MESSAGES } from "@/constants/errorMessages";
import { sameShippingMethod } from "@/lib/shipping-method";
import { createClient } from "@/lib/supabase/server";
import type {
  AppliedVoucherEntry,
  ApplyVoucherRequest,
  ApplyVoucherResponse,
  VoucherApplyItem,
  VoucherRow,
} from "@/types/voucher";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

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

async function getMaxVouchersPerOrder(): Promise<number> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("fees")
    .select("max_vouchers_per_order")
    .eq("id", 1)
    .maybeSingle();

  return Math.max(1, toNumber(data?.max_vouchers_per_order, 2));
}

/**
 * Shipping-method restriction: a voucher with a configured
 * `applies_to_shipping_methods` list only works when the checkout
 * shipping method is in that list. Empty/NULL = unrestricted.
 */
function matchesShippingMethod(
  voucher: Pick<VoucherRow, "applies_to_shipping_methods">,
  shippingMethodId?: string | null
): boolean {
  const allowed = voucher.applies_to_shipping_methods ?? [];
  if (allowed.length === 0) return true;
  if (!shippingMethodId) return false;
  return allowed.some((m) => sameShippingMethod(m, shippingMethodId));
}

/**
 * Resolve any missing category_slug values for cart items server-side
 * (authoritative — never trust the client for scope matching).
 */
async function resolveCategorySlugs(
  elevatedItems: VoucherApplyItem[]
): Promise<VoucherApplyItem[]> {
  const needsSlug = elevatedItems.filter((i) => !i.category_slug);
  if (needsSlug.length === 0) return elevatedItems;

  const supabase = await createClient();
  const productIds = [...new Set(needsSlug.map((i) => i.product_id))];

  const { data: categoryRows } = await supabase
    .from("categories")
    .select("id, slug");

  const slugById = new Map(
    (categoryRows ?? []).map((c) => [c.id, c.slug])
  );

  const { data: productRows } = await supabase
    .from("products")
    .select("id, category_id")
    .in("id", productIds);

  const slugByProductId = new Map<string, string | undefined>();
  for (const p of productRows ?? []) {
    if (p.category_id) slugByProductId.set(p.id, slugById.get(p.category_id));
  }

  return elevatedItems.map((i) => ({
    ...i,
    category_slug: i.category_slug ?? slugByProductId.get(i.product_id) ?? null,
  }));
}

/**
 * Compute the matched-subtotal base for a scoped voucher.
 * For order_total/shipping_fee, base = order subtotal.
 * For product/category, base = subtotal of matching line items only.
 */
function computeScopeBase(
  voucher: VoucherRow,
  items: VoucherApplyItem[],
  orderSubtotal: number
): { base: number; matches: boolean } {
  const excluded = new Set(voucher.excluded_product_ids ?? []);

  if (voucher.scope_type === "product") {
    const targetIds = voucher.applies_to_product_ids ?? [];
    if (targetIds.length === 0) return { base: 0, matches: false };
    const matching = items.filter(
      (i) => targetIds.includes(i.product_id) && !excluded.has(i.product_id)
    );
    if (matching.length === 0) return { base: 0, matches: false };
    const base = matching.reduce(
      (sum, i) => sum + i.unit_price * i.quantity,
      0
    );
    return { base, matches: true };
  }

  if (voucher.scope_type === "category") {
    const targetSlugs = new Set(voucher.applies_to_category_slugs ?? []);
    if (targetSlugs.size === 0) return { base: 0, matches: false };
    const matching = items.filter(
      (i) =>
        targetSlugs.has(i.category_slug ?? "") &&
        !excluded.has(i.product_id)
    );
    if (matching.length === 0) return { base: 0, matches: false };
    const base = matching.reduce(
      (sum, i) => sum + i.unit_price * i.quantity,
      0
    );
    return { base, matches: true };
  }

  // order_total / shipping_fee → whole order
  return { base: orderSubtotal, matches: true };
}

/**
 * POST /api/vouchers/apply
 * Apply one or more vouchers to the current user's cart.
 * Validates all vouchers (status, dates, usage limits, min order, stackable)
 * and returns per-voucher discount breakdown with cumulative totals.
 */
export async function POST(req: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: ApplyVoucherRequest = await req.json();
    const { voucherIds } = body;
    const subtotal = Math.max(0, toNumber(body.subtotal, 0));
    const shippingCost = Math.max(0, toNumber(body.shippingCost, 0));
    const shippingMethodId = body.shippingMethodId ?? null;
    const items: VoucherApplyItem[] =
      Array.isArray(body.items) ? body.items : [];

    // Resolve category slugs server-side for scope matching
    const resolvedItems = await resolveCategorySlugs(items);

    if (!voucherIds || voucherIds.length === 0) {
      return NextResponse.json(
        { error: "At least one voucher ID is required" },
        { status: 400 }
      );
    }

    // Deduplicate IDs
    const uniqueIds = [...new Set(voucherIds)];

    // Store-level cap: max vouchers per order
    const maxVouchers = await getMaxVouchersPerOrder();
    if (uniqueIds.length > maxVouchers) {
      return NextResponse.json(
        { error: VOUCHER_ERROR_MESSAGES.MAX_VOUCHERS_PER_ORDER(maxVouchers) },
        { status: 400 }
      );
    }

    // Fetch all vouchers in one query
    const { data: vouchers, error: fetchError } = await supabase
      .from("vouchers")
      .select("*")
      .in("id", uniqueIds);

    if (fetchError || !vouchers?.length) {
      return NextResponse.json(
        { error: VOUCHER_ERROR_MESSAGES.VOUCHER_NOT_FOUND },
        { status: 404 }
      );
    }

    const voucherMap = new Map<string, VoucherRow>(
      (vouchers as unknown as VoucherRow[]).map((v) => [v.id, v])
    );

    // Validate all IDs were found
    const foundIds = new Set(voucherMap.keys());
    const missingIds = uniqueIds.filter((id) => !foundIds.has(id));
    if (missingIds.length > 0) {
      return NextResponse.json(
        { error: VOUCHER_ERROR_MESSAGES.VOUCHER_NOT_FOUND },
        { status: 404 }
      );
    }

    const now = new Date();

    // Batch fetch per-user usage counts in a single query (avoid N+1)
    const voucherIdsWithPerUserLimit = uniqueIds.filter((id) => {
      const v = voucherMap.get(id)!;
      return v.usage_limit_per_user !== null && v.usage_limit_per_user > 0;
    });
    const usageCounts = new Map<string, number>();
    if (voucherIdsWithPerUserLimit.length > 0) {
      const { data: usageRows } = await supabase
        .from("orders")
        .select("voucher_id")
        .eq("user_id", user.id)
        .in("voucher_id", voucherIdsWithPerUserLimit);

      for (const row of usageRows ?? []) {
        if (!row.voucher_id) continue;
        usageCounts.set(
          row.voucher_id,
          (usageCounts.get(row.voucher_id) ?? 0) + 1
        );
      }
    }

    // Validate each voucher individually
    for (const id of uniqueIds) {
      const v = voucherMap.get(id)!;

      if (v.status !== "active") {
        return NextResponse.json(
          { error: `Voucher "${v.code}": ${VOUCHER_ERROR_MESSAGES.INVALID_VOUCHER}` },
          { status: 400 }
        );
      }

      if (v.deleted_at) {
        return NextResponse.json(
          { error: `Voucher "${v.code}": ${VOUCHER_ERROR_MESSAGES.INVALID_VOUCHER}` },
          { status: 400 }
        );
      }

      // Customer-specific voucher: only the target user can apply
      if (v.customer_ids && v.customer_ids.length > 0) {
        if (!v.customer_ids.includes(user.id)) {
          return NextResponse.json(
            { error: VOUCHER_ERROR_MESSAGES.VOUCHER_NOT_FOUND },
            { status: 404 }
          );
        }
      }

      // Shipping-method restriction
      if (!matchesShippingMethod(v, shippingMethodId)) {
        return NextResponse.json(
          {
            error: `Voucher "${v.code}": Không áp dụng cho phương thức vận chuyển đã chọn`,
          },
          { status: 400 }
        );
      }

      // Scope eligibility: product/category vouchers require matching cart items
      const { base: scopeBase, matches } = computeScopeBase(
        v,
        resolvedItems,
        subtotal
      );
      if (!matches) {
        return NextResponse.json(
          {
            error: `Voucher "${v.code}": Đơn hàng không đủ điều kiện áp dụng mã này`,
          },
          { status: 400 }
        );
      }

      if (
        (v.start_at && new Date(v.start_at) > now) ||
        (v.end_at && new Date(v.end_at) < now)
      ) {
        return NextResponse.json(
          { error: `Voucher "${v.code}": ${VOUCHER_ERROR_MESSAGES.OUT_OF_RANGE}` },
          { status: 400 }
        );
      }

      if (v.usage_limit_total !== null && v.used_count >= v.usage_limit_total) {
        return NextResponse.json(
          { error: `Voucher "${v.code}": ${VOUCHER_ERROR_MESSAGES.VOUCHER_LIMIT_EXCEEDED}` },
          { status: 400 }
        );
      }

      // Check per-user usage limit (uses pre-fetched batch data)
      if (v.usage_limit_per_user !== null && v.usage_limit_per_user > 0) {
        const currentUsage = usageCounts.get(id) ?? 0;
        if (currentUsage >= v.usage_limit_per_user) {
          return NextResponse.json(
            { error: `Voucher "${v.code}": ${VOUCHER_ERROR_MESSAGES.ALREADY_USED}` },
            { status: 400 }
          );
        }
      }

      // Validate minimum order amount (scoped vouchers use matched-subtotal base)
      const minOrderAmount = toNumber(v.min_order_amount, 0);
      if (scopeBase < minOrderAmount) {
        return NextResponse.json(
          {
            error: `Voucher "${v.code}": Đơn hàng phải tối thiểu ${minOrderAmount} VND`,
          },
          { status: 400 }
        );
      }
    }

    // Validate stackable constraint
    if (uniqueIds.length > 1) {
      const hasNonStackable = uniqueIds.some((id) => {
        const v = voucherMap.get(id)!;
        return !v.stackable;
      });

      if (hasNonStackable) {
        return NextResponse.json(
          { error: "Một số voucher không được sử dụng cùng các mã giảm giá khác" },
          { status: 400 }
        );
      }
    }

    // Calculate per-voucher discount + cumulative totals
    let totalDiscountAmount = 0;
    let totalShippingDiscountAmount = 0;
    const totalGifts: AppliedVoucherEntry["gifts"] = [];
    const entries: AppliedVoucherEntry[] = [];
    let hasFreeShipping = false;

    for (const id of uniqueIds) {
      const v = voucherMap.get(id)!;
      let discountAmount = 0;
      let shippingDiscountAmount = 0;

      // Discount base: matched-subtotal for product/category vouchers
      const isScoped =
        v.scope_type === "product" || v.scope_type === "category";
      const discountBase = isScoped
        ? computeScopeBase(v, resolvedItems, subtotal).base
        : subtotal;

      if (v.reward_type === "amount_off") {
        discountAmount = Math.min(
          toNumber(v.amount_off, 0),
          discountBase
        );
      } else if (v.reward_type === "percent_off") {
        const percentValue = toNumber(v.percent_off, 0);
        discountAmount = Math.round((discountBase * percentValue) / 100);
        const maxAmount = toNumber(v.max_discount_amount, 0);
        if (maxAmount > 0) {
          discountAmount = Math.min(discountAmount, maxAmount);
        }
        discountAmount = Math.min(discountAmount, discountBase);
      } else if (v.reward_type === "free_shipping") {
        // free_shipping: only the first free_shipping voucher grants shipping discount
        if (!hasFreeShipping) {
          shippingDiscountAmount = shippingCost;
          hasFreeShipping = true;
        }
      }

      const gifts: AppliedVoucherEntry["gifts"] =
        v.reward_type === "gift_item" && v.gift_product_id
          ? [
              {
                product_id: v.gift_product_id,
                variant_id: v.gift_variant_id,
                quantity: v.gift_quantity ?? 1,
              },
            ]
          : [];

      const entry: AppliedVoucherEntry = {
        voucherInfo: {
          voucher_id: v.id,
          voucher_code: v.code,
          voucher_name: v.name,
          reward_type: v.reward_type,
          scope_type: v.scope_type,
          benefit: {
            reward_type: v.reward_type,
            amount_off: v.amount_off,
            percent_off: v.percent_off,
            max_discount_amount: v.max_discount_amount,
            gift_product_id: v.gift_product_id,
            gift_variant_id: v.gift_variant_id,
            gift_quantity: v.gift_quantity,
            free_shipping: v.reward_type === "free_shipping",
          },
          rule: {
            min_order_amount: v.min_order_amount,
            min_item_quantity: v.min_item_quantity,
            applies_to_product_ids: v.applies_to_product_ids,
            applies_to_category_slugs: v.applies_to_category_slugs,
            excluded_product_ids: v.excluded_product_ids,
            applies_to_shipping_methods: v.applies_to_shipping_methods,
            stackable: v.stackable,
            usage_limit_total: v.usage_limit_total,
            usage_limit_per_user: v.usage_limit_per_user,
            start_at: v.start_at,
            end_at: v.end_at,
          },
        },
        discountAmount,
        shippingDiscountAmount,
        gifts,
      };

      entries.push(entry);
      totalDiscountAmount += discountAmount;
      totalShippingDiscountAmount += shippingDiscountAmount;
      totalGifts.push(...gifts);
    }

    // Cap totals
    totalDiscountAmount = Math.min(
      Math.max(0, totalDiscountAmount),
      subtotal
    );
    totalShippingDiscountAmount = Math.min(
      Math.max(0, totalShippingDiscountAmount),
      shippingCost
    );

    const response: ApplyVoucherResponse = {
      success: true,
      vouchers: entries,
      totalDiscountAmount,
      totalShippingDiscountAmount,
      totalGifts,
    };

    return NextResponse.json(response);
  } catch (err) {
    console.error("[POST /api/vouchers/apply] Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
