import { describe, expect, it } from "vitest";
import { CHECKOUT_ERROR_CODES, checkoutRpcErrorCode, isCheckoutErrorCode } from "./submit-order-errors";
import { checkoutErrorCatalog } from "../../../../../../apps/admin/src/lib/checkout-error-catalog";

describe("checkout error codes", () => {
  it("maps explicit SQL codes and unknown database failures safely", () => {
    expect(checkoutRpcErrorCode("CHECKOUT_STOCK_UNAVAILABLE: Product stock is insufficient"))
      .toBe("CHECKOUT_STOCK_UNAVAILABLE");
    expect(checkoutRpcErrorCode("CHECKOUT_DATABASE_ERROR: internal SQL details"))
      .toBe("CHECKOUT_SUBMIT_FAILED");
    expect(checkoutRpcErrorCode("sensitive raw postgres message"))
      .toBe("CHECKOUT_SUBMIT_FAILED");
  });

  it("has an admin explanation for every code emitted by checkout", () => {
    const catalogCodes = new Set(checkoutErrorCatalog.map(({ code }) => code));
    for (const code of CHECKOUT_ERROR_CODES) {
      expect(isCheckoutErrorCode(code)).toBe(true);
      expect(catalogCodes.has(code), `${code} is missing from the admin catalog`).toBe(true);
    }
  });
});
