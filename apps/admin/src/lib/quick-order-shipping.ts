function finite(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

/** Shipping reward discounts are limited to the actual fee. */
export function computeShippingDiscount({
  rewardType,
  percentOff,
  maxDiscountAmount,
  shippingCost,
}: {
  rewardType: string;
  percentOff?: number | string | null;
  maxDiscountAmount?: number | string | null;
  shippingCost: number;
}): number {
  const fee = Math.max(0, finite(shippingCost));
  if (fee === 0) return 0;
  if (rewardType === "free_shipping") return fee;
  if (rewardType !== "shipping_percent_off") return 0;

  const percent = finite(percentOff);
  if (percent <= 0) return 0;
  let discount = Math.round((fee * percent) / 100);
  const cap = finite(maxDiscountAmount);
  if (cap > 0) discount = Math.min(discount, cap);
  return Math.min(Math.max(0, discount), fee);
}
