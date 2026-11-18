import { describe, expect, it } from "vitest";
import {
  applyQuickOrderVoucher,
  parseManualShippingFee,
  parseQuickOrderPayment,
  parseQuickOrderCustomer,
  parseQuickOrderLines,
  priceQuickOrderLines,
  type QuickOrderProduct,
  type QuickOrderVariant,
  type QuickOrderVoucher,
} from "./quick-order";

const PRODUCT_ID = "11111111-1111-4111-8111-111111111111";
const VARIANT_ID = "22222222-2222-4222-8222-222222222222";
const PRODUCT: QuickOrderProduct = {
  id: PRODUCT_ID,
  name: "Keyboard",
  thumbnail: null,
  base_price: "100000",
  stock_quantity: 8,
  max_quantity: 5,
  product_type: "standard",
  is_active: true,
  pre_order_config: null,
  category_slug: "keyboards",
};
const VARIANT: QuickOrderVariant = {
  id: VARIANT_ID,
  product_id: PRODUCT_ID,
  variant_name: "Blue",
  price_adjustment: "25000",
  stock_quantity: 4,
  is_pre_order: false,
  pre_order_config: null,
  thumbnail: null,
};
const VOUCHER: QuickOrderVoucher = {
  id: "33333333-3333-4333-8333-333333333333",
  code: "SAVE10",
  status: "active",
  deleted_at: null,
  reward_type: "percent_off",
  scope_type: "order_total",
  amount_off: null,
  percent_off: 10,
  max_discount_amount: 50000,
  min_order_amount: 0,
  min_item_quantity: null,
  applies_to_product_ids: null,
  applies_to_category_slugs: null,
  excluded_product_ids: null,
  applies_to_shipping_methods: null,
  customer_ids: null,
  usage_limit_total: null,
  used_count: 0,
  start_at: null,
  end_at: null,
};

describe("quick order input", () => {
  it("normalizes a walk-in customer and validates product lines", () => {
    expect(parseQuickOrderCustomer({ name: " Walk-in ", address: " 1 Main St ", phone: " " })).toEqual({ name: "Walk-in", address: "1 Main St", phone: null });
    expect(parseQuickOrderLines([{ product_id: PRODUCT_ID, variant_id: null, quantity: 2 }])).toEqual([{ product_id: PRODUCT_ID, variant_id: null, quantity: 2 }]);
    expect(parseQuickOrderLines([{ product_id: "bad", quantity: 2 }])).toBeNull();
    expect(parseQuickOrderLines([{ product_id: PRODUCT_ID, variant_id: "842041c6eb11", quantity: 1 }])).not.toBeNull();
    expect(parseQuickOrderLines([{ product_id: PRODUCT_ID, variant_id: "invalid", quantity: 1 }])).toBeNull();
    expect(parseQuickOrderLines([{ product_id: PRODUCT_ID, parent_product_id: "invalid", quantity: 1 }])).toBeNull();
    expect(parseQuickOrderLines([{ product_id: PRODUCT_ID, quantity: 1.5 }])).toBeNull();
    expect(parseQuickOrderCustomer({ name: " ", address: "x" })).toBeNull();
  });

  it("validates full and deposit/COD payment choices", () => {
    expect(parseQuickOrderPayment({ payment_type: "full", mark_paid_now: true }, 100000, 100000)).toMatchObject({ paymentType: "full", depositAmount: 0 });
    expect(parseQuickOrderPayment({ payment_type: "deposit_cod", mark_paid_now: false, deposit_percentage: 30 }, 120000, 100000)).toMatchObject({ paymentType: "deposit_cod", depositPercentage: 30, depositAmount: 30000, remainingAmount: 90000 });
    expect(parseQuickOrderPayment({ payment_type: "deposit_cod", mark_paid_now: false, deposit_percentage: 90 }, 120000, 100000)).toBeNull();
  });

  it("accepts only a bounded non-negative integer shipping fee", () => {
    expect(parseManualShippingFee(0)).toBe(0);
    expect(parseManualShippingFee(25000)).toBe(25000);
    expect(parseManualShippingFee(-1)).toBeNull();
    expect(parseManualShippingFee(1.25)).toBeNull();
    expect(parseManualShippingFee(Number.NaN)).toBeNull();
  });
});

describe("priceQuickOrderLines", () => {
  const parent = { id: "44444444-4444-4444-8444-444444444444", name: "Plato kit", base_price: 6000000 };

  it.each([[0, 6000000], [250000, 6250000], [-200000, 5800000]])("uses parent kit base plus adjustment %i", (adjustment, expected) => {
    const component = { ...PRODUCT, product_type: "component", base_price: 0, stock_quantity: null, pricing_parents: [parent] };
    const result = priceQuickOrderLines([{ product_id: PRODUCT_ID, variant_id: VARIANT_ID, quantity: 1 }], [component], [{ ...VARIANT, price_adjustment: adjustment }]);
    expect(result?.lines[0]).toMatchObject({ product_id: PRODUCT_ID, variant_id: VARIANT_ID, unit_price: expected });
  });

  it("requires a valid explicit parent for shared components", () => {
    const otherParent = { ...parent, id: "55555555-5555-4555-8555-555555555555", base_price: 7000000 };
    const component = { ...PRODUCT, product_type: "component", pricing_parents: [parent, otherParent] };
    const line = { product_id: PRODUCT_ID, variant_id: VARIANT_ID, quantity: 1 };
    expect(priceQuickOrderLines([line], [component], [VARIANT])).toBeNull();
    expect(priceQuickOrderLines([{ ...line, parent_product_id: PRODUCT_ID }], [component], [VARIANT])).toBeNull();
    expect(priceQuickOrderLines([{ ...line, parent_product_id: otherParent.id }], [component], [VARIANT])?.subtotal).toBe(7025000);
    expect(priceQuickOrderLines([{ ...line, quantity: 3, parent_product_id: parent.id }, { ...line, quantity: 3, parent_product_id: otherParent.id }], [component], [VARIANT])).toBeNull();
  });

  it("uses database prices, accounts for variant adjustments, and aggregates duplicate lines", () => {
    const result = priceQuickOrderLines([
      { product_id: PRODUCT_ID, variant_id: VARIANT_ID, quantity: 1 },
      { product_id: PRODUCT_ID, variant_id: VARIANT_ID, quantity: 2 },
    ], [PRODUCT], [VARIANT]);
    expect(result).toMatchObject({ subtotal: 375000, lines: [{ quantity: 3, unit_price: 125000, variant_name: "Blue" }] });
  });

  it.each([
    ["rejects a variant belonging to another product", [{ ...VARIANT, product_id: "other" }], { ...PRODUCT, stock_quantity: 10 }],
    ["rejects out-of-stock variants", [VARIANT], { ...PRODUCT, stock_quantity: 10 }],
    ["rejects quantities over max_quantity", [], PRODUCT],
    ["rejects inactive products", [], { ...PRODUCT, is_active: false }],
    ["rejects kits", [], { ...PRODUCT, product_type: "kit", max_quantity: null, stock_quantity: 10 }],
    ["allows preorder products with tracking config", [], { ...PRODUCT, is_pre_order: true, pre_order_config: { estimate: "4 weeks" }, stock_quantity: 0 }],
  ])("%s", (_label, variants, product) => {
    const line = { product_id: PRODUCT_ID, variant_id: variants.length ? VARIANT_ID : null, quantity: variants.length ? 5 : 6 };
    const result = priceQuickOrderLines([line], [product], variants);
    if (_label === "allows preorder products with tracking config") {
      expect(result?.lines[0]).toMatchObject({ is_pre_order: true, unit_price: 100000, pre_order_config: { estimate: "4 weeks" } });
    } else {
      expect(result).toBeNull();
    }
  });

  it("prices component products from their variant, ignoring the null product stock row", () => {
    const component = { ...PRODUCT, product_type: "component", base_price: 0, stock_quantity: null };
    const result = priceQuickOrderLines([{ product_id: PRODUCT_ID, variant_id: VARIANT_ID, quantity: 3 }], [component], [VARIANT]);
    expect(result).toMatchObject({ subtotal: 75000, lines: [{ unit_price: 25000, variant_name: "Blue" }] });
  });

  it("rejects a component line when no variant is selected", () => {
    const component = { ...PRODUCT, product_type: "component", base_price: 0, stock_quantity: null };
    expect(priceQuickOrderLines([{ product_id: PRODUCT_ID, variant_id: null, quantity: 1 }], [component], [VARIANT])).toBeNull();
  });

  it("allows preorder variants without reducing stock and preserves their config", () => {
    const preorderVariant = { ...VARIANT, is_pre_order: true, stock_quantity: 0, pre_order_config: { estimate: "3 weeks" } };
    const result = priceQuickOrderLines([{ product_id: PRODUCT_ID, variant_id: VARIANT_ID, quantity: 2 }], [{ ...PRODUCT, stock_quantity: 0 }], [preorderVariant]);
    expect(result?.lines[0]).toMatchObject({ is_pre_order: true, pre_order_config: { estimate: "3 weeks" }, unit_price: 125000 });
  });
});

describe("applyQuickOrderVoucher", () => {
  const priced = priceQuickOrderLines([{ product_id: PRODUCT_ID, variant_id: VARIANT_ID, quantity: 2 }], [PRODUCT], [VARIANT])!;
  const input = { voucher: VOUCHER, products: [PRODUCT], lines: priced.lines, subtotal: priced.subtotal, shippingFee: 30000, now: new Date("2026-10-18T12:00:00Z") };

  it("calculates capped percent discounts from eligible server prices", () => {
    expect(applyQuickOrderVoucher(input)).toEqual({ ok: true, totals: { subtotal: 250000, voucherDiscount: 25000, shippingDiscount: 0, total: 255000 } });
  });

  it("rejects customer-bound or shipping-method-bound walk-in voucher uses", () => {
    expect(applyQuickOrderVoucher({ ...input, voucher: { ...VOUCHER, customer_ids: [PRODUCT_ID] } })).toMatchObject({ ok: false });
    expect(applyQuickOrderVoucher({ ...input, voucher: { ...VOUCHER, applies_to_shipping_methods: ["express"] } })).toMatchObject({ ok: false });
  });

  it("applies a capped shipping reward without discounting the product subtotal", () => {
    const result = applyQuickOrderVoucher({ ...input, voucher: { ...VOUCHER, scope_type: "shipping_fee", reward_type: "shipping_percent_off", percent_off: 50, max_discount_amount: 10000 } });
    expect(result).toEqual({ ok: true, totals: { subtotal: 250000, voucherDiscount: 0, shippingDiscount: 10000, total: 270000 } });
  });

  it("rejects a voucher when its eligible item quantity is too low", () => {
    expect(applyQuickOrderVoucher({ ...input, voucher: { ...VOUCHER, min_item_quantity: 3 } })).toMatchObject({ ok: false });
  });
});
