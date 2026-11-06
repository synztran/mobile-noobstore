import { describe, expect, it } from "vitest";
import {
  buildRpcItems,
  buildVoucherAdjustments,
  buildVoucherScopeItems,
  findIncompatibleComponent,
  type PriceMaps,
} from "./submit-order-logic";
import {
  rulesByKitProduct,
  type RuleRow,
} from "@/modules/products/kit-pricing";

const maps: PriceMaps = {
  productPriceMap: new Map([
    ["kit", 1000],
    ["keyboard", 500],
  ]),
  variantAdjMap: new Map([
    ["kit-v", 100],
    ["switch-v", 200],
  ]),
  variantProductMap: new Map([
    ["kit-v", "kit"],
    ["switch-v", "switches"],
  ]),
  rulesByKit: new Map(),
};

describe("checkout submit logic", () => {
  it("builds priced RPC rows including kit component adjustments", () => {
    const [row] = buildRpcItems(
      [
        {
          product_id: "kit",
          product_name: "Kit",
          quantity: 2,
          variant_id: "kit-v",
          components: [
            {
              variant_id: "switch-v",
              variant_name: "Switch",
              component_group: "switch",
              thumbnail: null,
            },
          ],
        },
      ],
      maps
    );
    expect(row.unit_price).toBe(1300);
    expect(row.components?.[0].price_adjustment).toBe(200);
    expect(row.quantity).toBe(2);
  });

  it("rejects unknown component variants only for configured kits", () => {
    const rules = rulesByKitProduct([
      {
        id: "r",
        kit_product_id: "kit",
        condition_variant_id: "kit-v",
        target_component_product_id: "switches",
        component_variant_rule_allowed: [],
      },
    ] satisfies RuleRow[]);
    const result = findIncompatibleComponent(
      [
        {
          product_id: "kit",
          product_name: "Kit",
          quantity: 1,
          components: [
            {
              variant_id: "missing",
              variant_name: "?",
              component_group: "switch",
              thumbnail: null,
            },
          ],
        },
      ],
      rules,
      maps.variantAdjMap,
      maps.variantProductMap
    );
    expect(result).toEqual({ kind: "unknown", variantId: "missing" });
  });

  it("adds kit component owners to voucher scope without double counting", () => {
    const items = [
      {
        product_id: "kit",
        product_name: "Kit",
        quantity: 2,
        components: [
          {
            variant_id: "switch-v",
            variant_name: "Switch",
            component_group: "switch",
            thumbnail: null,
          },
        ],
      },
    ];
    const rpcItems = buildRpcItems(items, maps);
    const scope = buildVoucherScopeItems({
      items,
      rpcItems,
      ownerByVariant: new Map([["switch-v", "switches"]]),
      categorySlugByProductId: new Map([
        ["kit", "kits"],
        ["switches", "parts"],
      ]),
    });
    expect(
      scope.map((item) => [item.product_id, item.quantity, item.unit_price])
    ).toEqual([
      ["kit", 2, 1200],
      ["switches", 2, 1200],
    ]);
  });

  it("keeps synthetic kit owners available for scoped voucher matching", () => {
    const items = [
      {
        product_id: "kit",
        product_name: "Kit",
        quantity: 1,
        components: [
          {
            variant_id: "switch-v",
            variant_name: "Switch",
            component_group: "switch",
            thumbnail: null,
          },
        ],
      },
    ];
    const scopeItems = buildVoucherScopeItems({
      items,
      rpcItems: buildRpcItems(items, maps),
      ownerByVariant: new Map([["switch-v", "switches"]]),
      categorySlugByProductId: new Map(),
    });
    const result = buildVoucherAdjustments({
      vouchers: [{ voucher_id: "order-wide", voucher_discount_amount: 100 }],
      voucherRows: [
        {
          id: "order-wide",
          status: "active",
          deleted_at: null,
          start_at: null,
          end_at: null,
          usage_limit_total: null,
          usage_limit_per_user: null,
          used_count: 0,
          customer_ids: null,
          applies_to_shipping_methods: null,
          reward_type: "amount_off",
          scope_type: "order_total",
          applies_to_product_ids: null,
          applies_to_category_slugs: null,
          excluded_product_ids: null,
          min_order_amount: 0,
          amount_off: 100,
          percent_off: null,
          max_discount_amount: null,
          gift_product_id: null,
          gift_variant_id: null,
          gift_quantity: null,
        },
      ],
      usageCounts: new Map(),
      userId: "u1",
      shippingMethodId: "standard",
      now: new Date("2026-01-01T00:00:00Z"),
      scopeItems,
      shippingCost: 0,
    });
    expect(result.cappedDiscount.get("order-wide")).toBe(100);
  });

  it("excludes products only from product/category scoped voucher bases", () => {
    const result = buildVoucherAdjustments({
      vouchers: [{ voucher_id: "excluded", voucher_discount_amount: 300 }],
      voucherRows: [
        {
          id: "excluded",
          status: "active",
          deleted_at: null,
          start_at: null,
          end_at: null,
          usage_limit_total: null,
          usage_limit_per_user: null,
          used_count: 0,
          customer_ids: null,
          applies_to_shipping_methods: null,
          reward_type: "amount_off",
          scope_type: "product",
          applies_to_product_ids: ["p1"],
          applies_to_category_slugs: null,
          excluded_product_ids: ["p1"],
          min_order_amount: 0,
          amount_off: 300,
          percent_off: null,
          max_discount_amount: null,
          gift_product_id: null,
          gift_variant_id: null,
          gift_quantity: null,
        },
      ],
      usageCounts: new Map(),
      userId: "u1",
      shippingMethodId: "standard",
      now: new Date("2026-01-01T00:00:00Z"),
      scopeItems: [
        { product_id: "p1", quantity: 1, unit_price: 500, category_slug: null },
      ],
      shippingCost: 0,
    });
    expect(result.validIds.has("excluded")).toBe(false);
  });

  it("rejects product-scoped voucher with no matched item", () => {
    const result = buildVoucherAdjustments({
      vouchers: [{ voucher_id: "no-match", voucher_discount_amount: 300 }],
      voucherRows: [
        {
          id: "no-match",
          status: "active",
          deleted_at: null,
          start_at: null,
          end_at: null,
          usage_limit_total: null,
          usage_limit_per_user: null,
          used_count: 0,
          customer_ids: null,
          applies_to_shipping_methods: null,
          reward_type: "amount_off",
          scope_type: "product",
          applies_to_product_ids: ["missing"],
          applies_to_category_slugs: null,
          excluded_product_ids: null,
          min_order_amount: 0,
          amount_off: 300,
          percent_off: null,
          max_discount_amount: null,
          gift_product_id: null,
          gift_variant_id: null,
          gift_quantity: null,
        },
      ],
      usageCounts: new Map(),
      userId: "u1",
      shippingMethodId: "standard",
      now: new Date("2026-01-01T00:00:00Z"),
      scopeItems: [
        { product_id: "p1", quantity: 1, unit_price: 500, category_slug: null },
      ],
      shippingCost: 0,
    });
    expect(result.validIds.has("no-match")).toBe(false);
  });

  it("caps voucher discounts using voucher values from DB rows", () => {
    const result = buildVoucherAdjustments({
      vouchers: [
        {
          voucher_id: "valid",
          voucher_discount_amount: 900,
          shipping_discount_amount: 0,
        },
      ],
      voucherRows: [
        {
          id: "valid",
          status: "active",
          deleted_at: null,
          start_at: null,
          end_at: null,
          usage_limit_total: null,
          usage_limit_per_user: null,
          used_count: 0,
          customer_ids: null,
          applies_to_shipping_methods: null,
          reward_type: "amount_off",
          scope_type: "order_total",
          applies_to_product_ids: null,
          applies_to_category_slugs: null,
          excluded_product_ids: null,
          min_order_amount: 0,
          amount_off: 100,
          percent_off: null,
          max_discount_amount: null,
          gift_product_id: null,
          gift_variant_id: null,
          gift_quantity: null,
        },
      ],
      usageCounts: new Map(),
      userId: "u1",
      shippingMethodId: "standard",
      now: new Date("2026-01-01T00:00:00Z"),
      scopeItems: [
        { product_id: "p1", quantity: 1, unit_price: 500, category_slug: null },
      ],
      shippingCost: 0,
    });
    expect(result.validIds).toEqual(new Set(["valid"]));
    expect(result.filteredVouchers).toHaveLength(1);
    expect(result.filteredVouchers[0].voucher_discount_amount).toBe(100);
    expect(result.filteredVouchers[0].gift_items_snapshot).toEqual([]);
  });
});
