/**
 * Shared order-status vocabulary for the admin app.
 *
 * Deposit orders (`payment_type === "deposit_cod"`) split payment into two
 * installments and therefore advance through a 5-step flow that never uses
 * "confirmed":
 *
 *   pending → first_paid (đặt cọc, deposit_paid_at) → second_paid
 *             (thanh toán đủ, paid_at) → delivering → delivered
 *
 * Full-payment orders keep the original linear flow:
 *
 *   pending → confirmed (paid_at) → delivering → delivered
 */

export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: "Chờ xác nhận",
  confirmed: "Đã xác nhận",
  first_paid: "Thanh toán lần 1",
  second_paid: "Thanh toán lần 2",
  delivering: "Đang giao",
  delivered: "Đã giao",
  returning: "Đang hoàn hàng",
  cancelled: "Đã hủy",
  refunded: "Đã hoàn tiền",
};

export function orderStatusLabel(status: string): string {
  return ORDER_STATUS_LABELS[status] ?? status;
}

export const MAIN_FLOW_FULL = [
  "pending",
  "confirmed",
  "delivering",
  "delivered",
] as const;

export const MAIN_FLOW_DEPOSIT = [
  "pending",
  "first_paid",
  "second_paid",
  "delivering",
  "delivered",
] as const;

export const PICKUP_FLOW_FULL = [
  "pending",
  "confirmed",
  "delivered",
] as const;

export const PICKUP_FLOW_DEPOSIT = [
  "pending",
  "first_paid",
  "second_paid",
  "delivered",
] as const;

export function mainFlow(paymentType?: string | null): readonly string[] {
  return paymentType === "deposit_cod" ? MAIN_FLOW_DEPOSIT : MAIN_FLOW_FULL;
}

export function mainFlowFor(
  paymentType?: string | null,
  isPickup?: boolean
): readonly string[] {
  if (isPickup) {
    return paymentType === "deposit_cod" ? PICKUP_FLOW_DEPOSIT : PICKUP_FLOW_FULL;
  }
  return mainFlow(paymentType);
}

/**
 * Where an order stands on the payment axis.
 *
 *   refunded          money went back to the customer — outranks everything
 *   paid              fully settled (`paid_at`)
 *   deposit_paid      deposit order, first instalment collected (`deposit_paid_at`)
 *   awaiting_deposit  deposit order still waiting for the first instalment
 *   unpaid            full-payment order that has not been paid
 *
 * `refunded` and `paid` are checked before the deposit branch because a
 * deposit order reaches `paid_at` on its second instalment, so ordering these
 * the other way round would report a settled order as merely deposit-paid.
 *
 * There is no payments table: `deposit_amount` / `remaining_amount` are what is
 * DUE and `deposit_paid_at` / `paid_at` are the only record that money moved.
 * So this derives state from those timestamps, never from the amounts.
 *
 * Lives here so the orders list column and the order-detail modal cannot drift
 * into reporting different payment states for the same order.
 */
export type PaymentState =
  | "refunded"
  | "paid"
  | "deposit_paid"
  | "awaiting_deposit"
  | "unpaid";

/**
 * Whether staff can still record money against this order.
 *
 * Status-driven, because the order status is what the payment form must follow
 * and it is available before the receipt ledger is fetched:
 *
 *   full            pending only — `confirmed` already means fully covered
 *   deposit_cod     pending (deposit), first_paid (balance), and the legacy
 *                   `confirmed` that OrderActionBar maps to first_paid
 *   deposit_cod     delivering — only while `paid_at` is null. The 158 guard
 *                   refuses `delivered` until the full amount is covered, so
 *                   hiding the form here would strand the order with no way to
 *                   record the COD balance.
 *
 * `second_paid`, `delivered`, `cancelled`, `refunded`, and `returning` are
 * never payable: the receipt RPC rejects the latter three outright, and the
 * other two are already fully settled.
 */
export function isAwaitingPayment({
  status,
  paymentType,
  paidAt,
}: {
  status: string;
  paymentType?: string | null;
  paidAt?: string | null;
}): boolean {
  if (
    status === "second_paid" ||
    status === "delivered" ||
    status === "cancelled" ||
    status === "refunded" ||
    status === "returning"
  ) {
    return false;
  }
  if (paymentType === "deposit_cod") {
    if (status === "pending" || status === "first_paid") return true;
    if (status === "confirmed") return true;
    return status === "delivering" && !paidAt;
  }
  return status === "pending";
}

export function getPaymentState({
  paymentType,
  paidAt,
  refundedAt,
  depositPaidAt,
}: {
  paymentType?: string | null;
  paidAt?: string | null;
  refundedAt?: string | null;
  depositPaidAt?: string | null;
}): PaymentState {
  if (refundedAt) return "refunded";
  if (paidAt) return "paid";
  if (paymentType === "deposit_cod" && depositPaidAt) return "deposit_paid";
  if (paymentType === "deposit_cod") return "awaiting_deposit";
  return "unpaid";
}