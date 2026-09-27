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
 * Scope semantics:
 *   - `shipping_fee` + `amount_off` / `percent_off` discounts the SHIPPING
 *     COST, not the item subtotal. This is the whole point of the scope.
 *   - `free_shipping` waives the full shipping cost regardless of scope.
 *     Kept scope-agnostic for backwards compatibility with vouchers seeded
 *     before `shipping_fee` was honoured.
 *   - every other scope discounts the order subtotal (or the matched
 *     subtotal for `product` / `category`, resolved by the caller).
 */

function num(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

export function isShippingScoped(scopeType: VoucherScopeType): boolean {
  return scopeType === "shipping_fee";
}

/** `free_shipping` waives shipping no matter which scope it carries. */
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
  /** Reduces the item subtotal. Always 0 for shipping-scoped vouchers. */
  orderDiscount: number;
  /** Reduces the shipping fee. Never negative, never exceeds shippingCost. */
  shippingDiscount: number;
}

export function computeVoucherDiscount(
  voucher: VoucherDiscountInput,
  bases: VoucherDiscountBases,
): VoucherDiscountResult {
  const orderBase = Math.max(0, num(bases.orderBase));
  const shippingCost = Math.max(0, num(bases.shippingCost));
  const zero: VoucherDiscountResult = { orderDiscount: 0, shippingDiscount: 0 };

  if (voucher.reward_type === "gift_item") return zero;

  if (isShippingOnlyReward(voucher.reward_type)) {
    return { orderDiscount: 0, shippingDiscount: shippingCost };
  }

  const targetsShipping = isShippingScoped(voucher.scope_type);
  const base = targetsShipping ? shippingCost : orderBase;

  let value: number;
  if (voucher.reward_type === "amount_off") {
    value = Math.min(num(voucher.amount_off), base);
  } else if (voucher.reward_type === "percent_off") {
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
