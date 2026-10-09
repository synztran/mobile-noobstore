import { describe, expect, it } from "vitest";
import {
  computeVoucherDiscount,
  isShippingOnlyReward,
  isShippingReward,
  totalVoucherDiscount,
  type VoucherDiscountInput,
} from "./voucher-discount";

const SHIPPING = 30_000;

function voucher(
  overrides: Partial<VoucherDiscountInput> = {}
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

// "Discount the shipping fee" is carried by the reward type, not by a
// scope_type. These replace the old shipping_fee-scope suite: the reward is
// now shipping_percent_off / shipping_amount_off, and the target is always
// order_total.
describe("computeVoucherDiscount — shipping reward types", () => {
  // The regression that shipped when this was a scope: a shipping voucher fell
  // through to the item subtotal, so a 50% shipping voucher discounted the cart.
  it("routes shipping_percent_off at the shipping fee, not the subtotal", () => {
    const result = computeVoucherDiscount(
      voucher({ reward_type: "shipping_percent_off", percent_off: 50 }),
      bases(1_000_000)
    );

    expect(result.shippingDiscount).toBe(15_000); // 50% of 30,000
    expect(result.orderDiscount).toBe(0);
  });

  it("routes shipping_amount_off at the shipping fee", () => {
    const result = computeVoucherDiscount(
      voucher({ reward_type: "shipping_amount_off", amount_off: 20_000 }),
      bases(1_000_000)
    );

    expect(result.shippingDiscount).toBe(20_000);
    expect(result.orderDiscount).toBe(0);
  });

  it("never lets a shipping voucher touch the order total", () => {
    const result = computeVoucherDiscount(
      voucher({ reward_type: "shipping_amount_off", amount_off: 999_999 }),
      bases(1_000_000)
    );

    expect(result.orderDiscount).toBe(0);
  });

  it("caps shipping_amount_off at the shipping fee instead of spilling over", () => {
    const result = computeVoucherDiscount(
      voucher({ reward_type: "shipping_amount_off", amount_off: 500_000 }),
      bases(1_000_000)
    );

    expect(result.shippingDiscount).toBe(SHIPPING);
    expect(totalVoucherDiscount(result)).toBe(SHIPPING);
  });

  it("caps shipping_percent_off at the shipping fee", () => {
    const result = computeVoucherDiscount(
      voucher({ reward_type: "shipping_percent_off", percent_off: 100 }),
      bases(1_000_000)
    );

    expect(result.shippingDiscount).toBe(SHIPPING);
  });

  it("honours max_discount_amount on a shipping percentage", () => {
    const result = computeVoucherDiscount(
      voucher({
        reward_type: "shipping_percent_off",
        percent_off: 50,
        max_discount_amount: 5_000,
      }),
      bases(1_000_000)
    );

    expect(result.shippingDiscount).toBe(5_000);
  });

  it("yields nothing when there is no shipping fee", () => {
    const result = computeVoucherDiscount(
      voucher({ reward_type: "shipping_percent_off", percent_off: 50 }),
      bases(1_000_000, 0)
    );

    expect(result.shippingDiscount).toBe(0);
  });

  // The target is the reward type, so scope can only affect targeting/min
  // order, never which bucket the saving lands in.
  it("ignores scope_type entirely when deciding the bucket", () => {
    const result = computeVoucherDiscount(
      voucher({
        reward_type: "shipping_amount_off",
        scope_type: "product",
        amount_off: 10_000,
      }),
      bases(1_000_000)
    );

    expect(result.shippingDiscount).toBe(10_000);
    expect(result.orderDiscount).toBe(0);
  });
});

describe("computeVoucherDiscount — order scopes", () => {
  it("still discounts the subtotal for order_total", () => {
    const result = computeVoucherDiscount(
      voucher({ reward_type: "percent_off", percent_off: 10 }),
      bases(200_000)
    );

    expect(result.orderDiscount).toBe(20_000);
    expect(result.shippingDiscount).toBe(0);
  });

  it("caps amount_off at the order base", () => {
    const result = computeVoucherDiscount(
      voucher({ amount_off: 500_000 }),
      bases(200_000)
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
      bases(80_000)
    );

    expect(result.orderDiscount).toBe(50_000);
  });

  it("ignores the shipping fee for order_total vouchers", () => {
    const result = computeVoucherDiscount(
      voucher({ amount_off: 10_000 }),
      bases(200_000, 999_999)
    );

    expect(result.shippingDiscount).toBe(0);
  });
});

describe("computeVoucherDiscount — free_shipping", () => {
  // Kept as a distinct reward type alongside shipping_percent_off @ 100%.
  it("waives the full fee", () => {
    const result = computeVoucherDiscount(
      voucher({ reward_type: "free_shipping" }),
      bases(1_000_000)
    );

    expect(result.shippingDiscount).toBe(SHIPPING);
    expect(result.orderDiscount).toBe(0);
  });

  // Scope-agnostic for vouchers seeded before the shipping scope was honoured.
  it("waives the full fee regardless of scope", () => {
    const result = computeVoucherDiscount(
      voucher({ reward_type: "free_shipping", scope_type: "product" }),
      bases(1_000_000)
    );

    expect(result.shippingDiscount).toBe(SHIPPING);
    expect(result.orderDiscount).toBe(0);
  });
});

describe("computeVoucherDiscount — edge cases", () => {
  it("returns nothing for gift_item", () => {
    const result = computeVoucherDiscount(
      voucher({ reward_type: "gift_item" }),
      bases(200_000)
    );

    expect(totalVoucherDiscount(result)).toBe(0);
  });

  it("treats a missing amount or percent as zero", () => {
    expect(
      totalVoucherDiscount(computeVoucherDiscount(voucher(), bases(200_000)))
    ).toBe(0);
    expect(
      totalVoucherDiscount(
        computeVoucherDiscount(
          voucher({ reward_type: "percent_off" }),
          bases(200_000)
        )
      )
    ).toBe(0);
    expect(
      totalVoucherDiscount(
        computeVoucherDiscount(
          voucher({ reward_type: "shipping_percent_off" }),
          bases(200_000)
        )
      )
    ).toBe(0);
  });

  it("coerces string numerics", () => {
    const result = computeVoucherDiscount(
      {
        reward_type: "shipping_amount_off",
        scope_type: "order_total",
        amount_off: "20000" as unknown as number,
      },
      bases(200_000)
    );

    expect(result.shippingDiscount).toBe(20_000);
  });

  it("clamps negative bases to zero", () => {
    const result = computeVoucherDiscount(
      voucher({ reward_type: "shipping_percent_off", percent_off: 50 }),
      bases(-100, -100)
    );

    expect(result.shippingDiscount).toBe(0);
  });

  it("rounds percentages to the nearest whole dong", () => {
    const result = computeVoucherDiscount(
      voucher({ reward_type: "shipping_percent_off", percent_off: 33 }),
      bases(1_000_000, 30_001)
    );

    expect(result.shippingDiscount).toBe(Math.round((30_001 * 33) / 100));
  });
});

describe("isShippingReward", () => {
  it("is true for the three shipping reward types", () => {
    expect(isShippingReward("shipping_amount_off")).toBe(true);
    expect(isShippingReward("shipping_percent_off")).toBe(true);
    expect(isShippingReward("free_shipping")).toBe(true);
  });

  it("is false for cart rewards and gifts", () => {
    expect(isShippingReward("amount_off")).toBe(false);
    expect(isShippingReward("percent_off")).toBe(false);
    expect(isShippingReward("gift_item")).toBe(false);
  });
});

describe("isShippingOnlyReward", () => {
  it("is true only for free_shipping", () => {
    expect(isShippingOnlyReward("free_shipping")).toBe(true);
    // The percentage/fixed shipping rewards reduce the fee but are not
    // "only" shipping in the waive-everything sense.
    expect(isShippingOnlyReward("shipping_amount_off")).toBe(false);
    expect(isShippingOnlyReward("shipping_percent_off")).toBe(false);
    expect(isShippingOnlyReward("amount_off")).toBe(false);
  });
});
