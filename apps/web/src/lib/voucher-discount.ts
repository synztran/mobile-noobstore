import type { VoucherRewardType, VoucherScopeType } from "@/types/voucher";

/**
 * Single source of truth for "how much does this voucher actually save".
 *
 * This math is needed in three places that must never disagree:
 *   - `api/vouchers/apply`      → the number the customer sees
 *   - `api/checkout/submit`     → the server-authoritative recompute
 *   - `hooks/useVouchers`       → ranking which voucher to auto-apply
 *
 * It lives here as a pure function (no Supabase, no `server-only`) so all
 * three can import it, and so it is unit-testable without a database.
 *
 * Reward semantics:
 *   - `shipping_amount_off` / `shipping_percent_off` discount the SHIPPING
 *     COST, not the item subtotal. The target is carried by the reward type
 *     itself; there is no longer a `shipping_fee` scope. `scope_type` on
 *     these vouchers is always `order_total` and governs min_order_amount /
 *     targeting only.
 *   - `free_shipping` waives the full shipping cost, also keyed off the
 *     reward type. Kept alongside the percent variant at the owner's request.
 *   - `amount_off` / `percent_off` discount the item subtotal (or the matched
 *     subtotal for `product` / `category`, resolved by the caller).
 *   - `gift_item` produces no monetary discount.
 */

function num(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

/** Reward types whose saving comes off the shipping fee rather than the cart. */
export function isShippingReward(rewardType: VoucherRewardType): boolean {
  return (
    rewardType === "shipping_amount_off" ||
    rewardType === "shipping_percent_off" ||
    rewardType === "free_shipping"
  );
}

/** `free_shipping` waives the fee outright; the percent variants reduce it. */
export function isShippingOnlyReward(rewardType: VoucherRewardType): boolean {
  return rewardType === "free_shipping";
}

export interface VoucherDiscountInput {
  reward_type: VoucherRewardType;
  scope_type: VoucherScopeType;
  amount_off?: number | null;
  percent_off?: number | null;
  max_discount_amount?: number | null;
}

export interface VoucherDiscountBases {
  /** Discountable item amount. Matched subtotal for product/category. */
  orderBase: number;
  /** Actual shipping fee charged at checkout. */
  shippingCost: number;
}

export interface VoucherDiscountResult {
  /** Reduces the item subtotal. Always 0 for shipping reward types. */
  orderDiscount: number;
  /** Reduces the shipping fee. Never negative, never exceeds shippingCost. */
  shippingDiscount: number;
}

export function computeVoucherDiscount(
  voucher: VoucherDiscountInput,
  bases: VoucherDiscountBases
): VoucherDiscountResult {
  const orderBase = Math.max(0, num(bases.orderBase));
  const shippingCost = Math.max(0, num(bases.shippingCost));
  const zero: VoucherDiscountResult = { orderDiscount: 0, shippingDiscount: 0 };

  if (voucher.reward_type === "gift_item") return zero;

  if (isShippingOnlyReward(voucher.reward_type)) {
    return { orderDiscount: 0, shippingDiscount: shippingCost };
  }

  // The reward type alone decides which bucket is hit, so a shipping voucher
  // can never discount the cart even if it is targeted at products.
  const targetsShipping = isShippingReward(voucher.reward_type);
  const base = targetsShipping ? shippingCost : orderBase;

  let value: number;
  if (
    voucher.reward_type === "amount_off" ||
    voucher.reward_type === "shipping_amount_off"
  ) {
    value = Math.min(num(voucher.amount_off), base);
  } else if (
    voucher.reward_type === "percent_off" ||
    voucher.reward_type === "shipping_percent_off"
  ) {
    value = Math.round((base * num(voucher.percent_off)) / 100);
    const maxAmount = num(voucher.max_discount_amount);
    if (maxAmount > 0) value = Math.min(value, maxAmount);
    value = Math.min(value, base);
  } else {
    return zero;
  }

  // A voucher can never take more than it is applied against, so an
  // amount_off larger than the shipping fee stops at the fee instead of
  // spilling over into the order total.
  value = Math.max(0, Math.min(value, base));

  return targetsShipping
    ? { orderDiscount: 0, shippingDiscount: value }
    : { orderDiscount: value, shippingDiscount: 0 };
}

/** Total saving across both buckets — used to rank auto-apply candidates. */
export function totalVoucherDiscount(result: VoucherDiscountResult): number {
  return result.orderDiscount + result.shippingDiscount;
}
