import { describe, expect, it } from "vitest";
import {
  computeVoucherDiscount,
  isShippingScoped,
  totalVoucherDiscount,
  type VoucherDiscountInput,
} from "./voucher-discount";

const SHIPPING = 30_000;

function voucher(
  overrides: Partial<VoucherDiscountInput> = {},
): VoucherDiscountInput {
  return {
    reward_type: "amount_off",
    scope_type: "order_total",
    amount_off: null,
    percent_off: null,
    max_discount_amount: null,
    ...overrides,
  };
}

const bases = (orderBase: number, shippingCost = SHIPPING) => ({
  orderBase,
  shippingCost,
});

describe("computeVoucherDiscount — shipping_fee scope", () => {
  // The regression that shipped: shipping_fee fell through to the item
  // subtotal, so a 50% shipping voucher discounted the cart instead.
  it("routes percent_off at the shipping fee, not the subtotal", () => {
    const result = computeVoucherDiscount(
      voucher({
        reward_type: "percent_off",
        scope_type: "shipping_fee",
        percent_off: 50,
      }),
      bases(1_000_000),
    );

    expect(result.shippingDiscount).toBe(15_000); // 50% of 30,000
    expect(result.orderDiscount).toBe(0);
  });

  it("routes amount_off at the shipping fee", () => {
    const result = computeVoucherDiscount(
      voucher({
        reward_type: "amount_off",
        scope_type: "shipping_fee",
        amount_off: 20_000,
      }),
      bases(1_000_000),
    );

    expect(result.shippingDiscount).toBe(20_000);
    expect(result.orderDiscount).toBe(0);
  });

  it("never lets a shipping voucher touch the order total", () => {
    const result = computeVoucherDiscount(
      voucher({
        reward_type: "amount_off",
        scope_type: "shipping_fee",
        amount_off: 999_999,
      }),
      bases(1_000_000),
    );

    expect(result.orderDiscount).toBe(0);
  });

  it("caps amount_off at the shipping fee instead of spilling over", () => {
    const result = computeVoucherDiscount(
      voucher({
        reward_type: "amount_off",
        scope_type: "shipping_fee",
        amount_off: 500_000,
      }),
      bases(1_000_000),
    );

    expect(result.shippingDiscount).toBe(SHIPPING);
    expect(totalVoucherDiscount(result)).toBe(SHIPPING);
  });

  it("caps percent_off at the shipping fee", () => {
    const result = computeVoucherDiscount(
      voucher({
        reward_type: "percent_off",
        scope_type: "shipping_fee",
        percent_off: 100,
      }),
      bases(1_000_000),
    );

    expect(result.shippingDiscount).toBe(SHIPPING);
  });

  it("honours max_discount_amount on a shipping percentage", () => {
    const result = computeVoucherDiscount(
      voucher({
        reward_type: "percent_off",
        scope_type: "shipping_fee",
        percent_off: 50,
        max_discount_amount: 5_000,
      }),
      bases(1_000_000),
    );

    expect(result.shippingDiscount).toBe(5_000);
  });

  it("yields nothing when there is no shipping fee", () => {
    const result = computeVoucherDiscount(
      voucher({
        reward_type: "percent_off",
        scope_type: "shipping_fee",
        percent_off: 50,
      }),
      bases(1_000_000, 0),
    );

    expect(result.shippingDiscount).toBe(0);
  });
});

describe("computeVoucherDiscount — order scopes", () => {
  it("still discounts the subtotal for order_total", () => {
    const result = computeVoucherDiscount(
      voucher({ reward_type: "percent_off", percent_off: 10 }),
      bases(200_000),
    );

    expect(result.orderDiscount).toBe(20_000);
    expect(result.shippingDiscount).toBe(0);
  });

  it("caps amount_off at the order base", () => {
    const result = computeVoucherDiscount(
      voucher({ amount_off: 500_000 }),
      bases(200_000),
    );

    expect(result.orderDiscount).toBe(200_000);
  });

  it("uses the caller's matched base for scoped vouchers", () => {
    const result = computeVoucherDiscount(
      voucher({
        reward_type: "amount_off",
        scope_type: "product",
        amount_off: 50_000,
      }),
      bases(80_000),
    );

    expect(result.orderDiscount).toBe(50_000);
  });

  it("ignores the shipping fee for order_total vouchers", () => {
    const result = computeVoucherDiscount(
      voucher({ amount_off: 10_000 }),
      bases(200_000, 999_999),
    );

    expect(result.shippingDiscount).toBe(0);
  });
});

describe("computeVoucherDiscount — free_shipping", () => {
  it("waives the full fee when scoped to shipping_fee", () => {
    const result = computeVoucherDiscount(
      voucher({ reward_type: "free_shipping", scope_type: "shipping_fee" }),
      bases(1_000_000),
    );

    expect(result.shippingDiscount).toBe(SHIPPING);
  });

  // Kept scope-agnostic for vouchers seeded before shipping_fee was honoured.
  it("still waives the full fee under a non-shipping scope", () => {
    const result = computeVoucherDiscount(
      voucher({ reward_type: "free_shipping", scope_type: "order_total" }),
      bases(1_000_000),
    );

    expect(result.shippingDiscount).toBe(SHIPPING);
    expect(result.orderDiscount).toBe(0);
  });
});

describe("computeVoucherDiscount — edge cases", () => {
  it("returns nothing for gift_item", () => {
    const result = computeVoucherDiscount(
      voucher({ reward_type: "gift_item" }),
      bases(200_000),
    );

    expect(totalVoucherDiscount(result)).toBe(0);
  });

  it("treats a missing amount or percent as zero", () => {
    expect(
      totalVoucherDiscount(computeVoucherDiscount(voucher(), bases(200_000))),
    ).toBe(0);
    expect(
      totalVoucherDiscount(
        computeVoucherDiscount(
          voucher({ reward_type: "percent_off" }),
          bases(200_000),
        ),
      ),
    ).toBe(0);
  });

  it("coerces string numerics", () => {
    const result = computeVoucherDiscount(
      {
        reward_type: "amount_off",
        scope_type: "shipping_fee",
        amount_off: "20000" as unknown as number,
      },
      bases(200_000),
    );

    expect(result.shippingDiscount).toBe(20_000);
  });

  it("clamps negative bases to zero", () => {
    const result = computeVoucherDiscount(
      voucher({
        reward_type: "percent_off",
        scope_type: "shipping_fee",
        percent_off: 50,
      }),
      bases(-100, -100),
    );

    expect(result.shippingDiscount).toBe(0);
  });

  it("rounds percentages to the nearest whole dong", () => {
    const result = computeVoucherDiscount(
      voucher({
        reward_type: "percent_off",
        scope_type: "shipping_fee",
        percent_off: 33,
      }),
      bases(1_000_000, 30_001),
    );

    expect(result.shippingDiscount).toBe(Math.round((30_001 * 33) / 100));
  });
});

describe("isShippingScoped", () => {
  it("is true only for shipping_fee", () => {
    expect(isShippingScoped("shipping_fee")).toBe(true);
    expect(isShippingScoped("order_total")).toBe(false);
    expect(isShippingScoped("product")).toBe(false);
    expect(isShippingScoped("category")).toBe(false);
  });
});
