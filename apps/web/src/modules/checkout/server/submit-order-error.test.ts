import { describe, expect, it } from "vitest";

function checkoutErrorCode(message: string) {
  return /CHECKOUT_DATABASE_ERROR: .* during/i.test(message)
    ? `CHECKOUT_FAILED_${/during ([a-z_]+)/i.exec(message)?.[1]?.toUpperCase()}`
    : /CHECKOUT_DATABASE_ERROR phase=([a-z_]+)/i.test(message)
      ? `CHECKOUT_FAILED_${/CHECKOUT_DATABASE_ERROR phase=([a-z_]+)/i.exec(message)?.[1]?.toUpperCase()}`
    : /CHECKOUT_DATABASE_ERROR/.test(message)
      ? "CHECKOUT_DATABASE_REJECTED"
    : /CHECKOUT_SCHEMA_TYPE_MISMATCH|operator does not exist: text = uuid/i.test(message)
    ? "CHECKOUT_SCHEMA_TYPE_MISMATCH"
    : /CHECKOUT_IDEMPOTENCY_CONFLICT|Idempotency key reused/i.test(message)
      ? "CHECKOUT_IDEMPOTENCY_CONFLICT"
      : /CHECKOUT_VOUCHER_LIMIT|CHECKOUT_VOUCHER_UNAVAILABLE|usage limit exceeded|Voucher unavailable/i.test(message)
        ? "CHECKOUT_VOUCHER_UNAVAILABLE"
        : /CHECKOUT_GIFT_STOCK/.test(message)
          ? "CHECKOUT_GIFT_STOCK"
          : "CHECKOUT_DATABASE_REJECTED";
}

describe("checkout database error codes", () => {
  it("classifies schema type mismatches without exposing raw SQL to clients", () => {
    expect(checkoutErrorCode("operator does not exist: text = uuid"))
      .toBe("CHECKOUT_SCHEMA_TYPE_MISMATCH");
  });

  it("returns stable categories for idempotency, voucher, gift, and unknown errors", () => {
    expect(checkoutErrorCode("CHECKOUT_IDEMPOTENCY_CONFLICT: key reused"))
      .toBe("CHECKOUT_IDEMPOTENCY_CONFLICT");
    expect(checkoutErrorCode("CHECKOUT_VOUCHER_LIMIT: reached"))
      .toBe("CHECKOUT_VOUCHER_UNAVAILABLE");
    expect(checkoutErrorCode("CHECKOUT_GIFT_STOCK: unavailable"))
      .toBe("CHECKOUT_GIFT_STOCK");
    expect(checkoutErrorCode("CHECKOUT_DATABASE_ERROR phase=record_idempotency_response"))
      .toBe("CHECKOUT_FAILED_RECORD_IDEMPOTENCY_RESPONSE");
    expect(checkoutErrorCode("CHECKOUT_DATABASE_ERROR: operator does not exist: text = uuid during validate_vouchers (SQLSTATE 42883)"))
      .toBe("CHECKOUT_FAILED_VALIDATE_VOUCHERS");
    expect(checkoutErrorCode("some postgres failure"))
      .toBe("CHECKOUT_DATABASE_REJECTED");
  });
});
