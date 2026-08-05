import { afterEach, describe, expect, it, vi } from "vitest";
import type { AppliedVoucherEntry, VoucherRule } from "@/types/voucher";

vi.mock("gooey-toast", () => ({
  gooeyToast: {
    success: () => {},
    error: () => {},
    info: () => {},
    warning: () => {},
  },
}));

import { useDiscountStore } from "./useDiscount";

const BASE_RULE: VoucherRule = {
  min_order_amount: 0,
  min_item_quantity: null,
  applies_to_product_ids: null,
  applies_to_category_slugs: null,
  excluded_product_ids: null,
  applies_to_shipping_methods: null,
  stackable: true,
  usage_limit_total: null,
  usage_limit_per_user: null,
  start_at: null,
  end_at: null,
};

function makeEntry(
  id: string,
  overrides: { scope_type?: string; rule?: Partial<VoucherRule>; discountAmount?: number; shippingDiscountAmount?: number }
): AppliedVoucherEntry {
  return {
    voucherInfo: {
      voucher_id: id,
      voucher_code: `V${id}`,
      voucher_name: `Voucher ${id}`,
      reward_type: "free_shipping",
      scope_type: (overrides.scope_type ?? "shipping_fee") as AppliedVoucherEntry["voucherInfo"]["scope_type"],
      benefit: {
        reward_type: "free_shipping",
        amount_off: null,
        percent_off: null,
        max_discount_amount: null,
        gift_product_id: null,
        gift_variant_id: null,
        gift_quantity: null,
        free_shipping: true,
      },
      rule: { ...BASE_RULE, ...overrides.rule },
    },
    discountAmount: overrides.discountAmount ?? 0,
    shippingDiscountAmount: overrides.shippingDiscountAmount ?? 0,
    gifts: [],
  };
}

describe("useDiscountStore.pruneAppliedVouchers", () => {
  afterEach(() => {
    useDiscountStore.getState().resetDiscount();
  });

  it("removes only the vouchers whose shipping-method list no longer matches", () => {
    const store = useDiscountStore.getState();
    store.setAppliedVouchers(
      [
        makeEntry("1", {
          rule: { applies_to_shipping_methods: ["express"] },
          shippingDiscountAmount: 15000,
        }),
        makeEntry("2", {
          rule: { applies_to_shipping_methods: null },
          shippingDiscountAmount: 10000,
        }),
      ],
      0,
      25000,
      []
    );

    useDiscountStore.getState().pruneAppliedVouchers(["1"]);

    const state = useDiscountStore.getState();
    expect(state.appliedVouchers.map((v) => v.voucherInfo.voucher_id)).toEqual([
      "2",
    ]);
    expect(state.totalShippingDiscountAmount).toBe(10000);
  });

  it("removes vouchers below the min order amount", () => {
    useDiscountStore.getState().setAppliedVouchers(
      [
        makeEntry("1", {
          rule: { min_order_amount: 500_000 },
          discountAmount: 50_000,
        }),
        makeEntry("2", {
          rule: { min_order_amount: 0 },
          discountAmount: 10_000,
        }),
      ],
      60_000,
      0,
      []
    );

    useDiscountStore.getState().pruneAppliedVouchers(["1"]);

    const state = useDiscountStore.getState();
    expect(state.appliedVouchers.map((v) => v.voucherInfo.voucher_id)).toEqual([
      "2",
    ]);
    expect(state.totalDiscountAmount).toBe(10_000);
  });

  it("is a no-op when no applied voucher is invalid", () => {
    useDiscountStore.getState().setAppliedVouchers(
      [makeEntry("1", { discountAmount: 5_000 })],
      5_000,
      0,
      []
    );

    useDiscountStore.getState().pruneAppliedVouchers(["99"]);

    const state = useDiscountStore.getState();
    expect(state.appliedVouchers).toHaveLength(1);
    expect(state.totalDiscountAmount).toBe(5_000);
  });

  it("clears everything when the last applied voucher is pruned", () => {
    useDiscountStore.getState().setAppliedVouchers(
      [makeEntry("1", { shippingDiscountAmount: 15_000 })],
      0,
      15_000,
      []
    );

    useDiscountStore.getState().pruneAppliedVouchers(["1"]);

    const state = useDiscountStore.getState();
    expect(state.appliedVouchers).toHaveLength(0);
    expect(state.totalShippingDiscountAmount).toBe(0);
  });
});
