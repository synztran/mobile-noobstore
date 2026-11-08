export const CHECKOUT_ERROR_CODES = [
  "CHECKOUT_FORBIDDEN",
  "CHECKOUT_DELIVERY_SAVE_FAILED",
  "CHECKOUT_DEPOSIT_UNAVAILABLE",
  "CHECKOUT_CONFLICT",
  "CHECKOUT_GIFT_STOCK_UNAVAILABLE",
  "CHECKOUT_IDEMPOTENCY_CONFLICT",
  "CHECKOUT_INVALID_CONFIGURATION",
  "CHECKOUT_INVALID_IDEMPOTENCY",
  "CHECKOUT_INVALID_ITEMS",
  "CHECKOUT_INVALID_PAYLOAD",
  "CHECKOUT_INCOMPATIBLE_CONFIGURATION",
  "CHECKOUT_INTERNAL_ERROR",
  "CHECKOUT_PICKUP_TIME_REQUIRED",
  "CHECKOUT_PRICE_LOOKUP_FAILED",
  "CHECKOUT_PRODUCT_NOT_FOUND",
  "CHECKOUT_STOCK_UNAVAILABLE",
  "CHECKOUT_SUBMIT_FAILED",
  "CHECKOUT_UNAUTHORIZED",
  "CHECKOUT_VARIANT_NOT_FOUND",
  "CHECKOUT_VOUCHER_INVALID",
  "CHECKOUT_VOUCHER_LIMIT_EXCEEDED",
  "CHECKOUT_VOUCHER_UNAVAILABLE",
  "CHECKOUT_VOUCHER_VALIDATION_FAILED",
] as const;

export type CheckoutErrorCode = (typeof CHECKOUT_ERROR_CODES)[number];

export function isCheckoutErrorCode(value: unknown): value is CheckoutErrorCode {
  return typeof value === "string" && CHECKOUT_ERROR_CODES.includes(value as CheckoutErrorCode);
}

export function checkoutRpcErrorCode(message: string): CheckoutErrorCode {
  const explicitCode = /CHECKOUT_[A-Z_]+/.exec(message)?.[0];
  if (isCheckoutErrorCode(explicitCode) && explicitCode !== "CHECKOUT_SUBMIT_FAILED") {
    return explicitCode;
  }
  if (/Idempotency key reused/i.test(message)) return "CHECKOUT_IDEMPOTENCY_CONFLICT";
  if (/usage limit exceeded/i.test(message)) return "CHECKOUT_VOUCHER_LIMIT_EXCEEDED";
  if (/Voucher unavailable/i.test(message)) return "CHECKOUT_VOUCHER_UNAVAILABLE";
  return "CHECKOUT_SUBMIT_FAILED";
}
