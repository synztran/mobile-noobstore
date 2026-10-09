/**
 * Deposit ("đặt cọc") availability and percentage rules — shared by the
 * checkout summary UI and the submit API route so client and server always
 * agree, and so the server is the backstop against a crafted request.
 *
 * Rules:
 * - Courier tiers (DeliveryService / Carrier4h) are fee-pending: the delivery
 *   fee is quoted after checkout, so a deposit percentage of an incomplete total
 *   is meaningless. Blocked always.
 * - Store pickup is never eligible for deposit.
 * - Pre-order orders may deposit at a 20% minimum, at any order total.
 * - Regular orders may deposit at a 1% minimum ONLY when the final total is
 *   above DEPOSIT_LOW_PCT_MIN_ORDER_TOTAL; below that the minimum is 20%.
 *
 * The 1% tier is for high-value orders where a nominal hold is the point.
 * Lower-value orders must hold a meaningful deposit (20%), otherwise a 1%
 * deposit on a small order is not a deposit at all.
 *
 * Note: there is no maximum order total. The 5,000,000₫ cap this replaced
 * ran the OPPOSITE way — it allowed 1% only at or below 5M and blocked
 * everything above — which contradicted the business rule.
 */

export const DEPOSIT_LOW_PCT_MIN_ORDER_TOTAL = 10_000_000;
export const DEPOSIT_MIN_PCT = 1;
export const DEPOSIT_MIN_PCT_PRE_ORDER = 20;
export const DEPOSIT_MAX_PCT = 80;
export const DEPOSIT_DEFAULT_PCT = 50;

interface DepositEligibility {
  hasPreOrder: boolean;
  orderTotal: number;
  isPickup: boolean;
  isFeePending: boolean;
}

export function canUseDeposit({
  isPickup,
  isFeePending,
}: DepositEligibility): boolean {
  // Eligibility is no longer a function of the total — only of fulfilment
  // method. Kept as an object arg so callers stay in sync with the shared shape.
  if (isFeePending || isPickup) return false;
  return true;
}

/**
 * Minimum deposit percentage for this order.
 *
 * 1% is offered ONLY for a regular (non-pre-order) order above
 * DEPOSIT_LOW_PCT_MIN_ORDER_TOTAL. Everything else — including pre-order, and
 * a regular order at or below the threshold — floors at 20%.
 */
export function minDepositPercentage(
  hasPreOrder: boolean,
  orderTotal: number
): number {
  if (hasPreOrder) return DEPOSIT_MIN_PCT_PRE_ORDER;
  return orderTotal > DEPOSIT_LOW_PCT_MIN_ORDER_TOTAL
    ? DEPOSIT_MIN_PCT
    : DEPOSIT_MIN_PCT_PRE_ORDER;
}

/** True when this order qualifies for the 1% minimum. Useful for UI copy. */
export function hasLowPctDeposit(hasPreOrder: boolean, orderTotal: number): boolean {
  return (
    !hasPreOrder && orderTotal > DEPOSIT_LOW_PCT_MIN_ORDER_TOTAL
  );
}

/**
 * Clamp a requested percentage into the range legal for this order.
 *
 * This is the server-side guarantee: even if the client offers 1% on an order
 * that does not qualify, the stored percentage is floored to 20%.
 */
export function clampDepositPercentage(
  raw: number | null | undefined,
  hasPreOrder: boolean,
  orderTotal: number
): number {
  const min = minDepositPercentage(hasPreOrder, orderTotal);
  return Math.min(
    DEPOSIT_MAX_PCT,
    Math.max(min, Math.round(raw ?? DEPOSIT_DEFAULT_PCT))
  );
}