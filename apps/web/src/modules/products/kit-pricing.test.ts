import { describe, expect, it } from "vitest";

import type { ComponentVariantRule } from "@/modules/products/types";
import type { RuleRow } from "@/modules/products/kit-pricing";
import { toRulesByProductId } from "@/modules/products/kit-pricing";
import {
  effectiveContribution,
  findDisallowedComponentVariant,
  findPriceLadderInversion,
  kitPriceOverrides,
  resolveComponentContributions,
  resolveKitUnitPrice,
  rulesByKitProduct,
} from "@/modules/products/kit-pricing";

const PURPLE = "kit-variant-purple";
const TRASH = "kit-variant-trash";
const SW_70 = "component-70switches";
const SW_90 = "component-90switches";

function rule(over: Partial<ComponentVariantRule>): ComponentVariantRule {
  return {
    id: "rule-1",
    condition_variant_id: PURPLE,
    target_component_product_id: "switches-product",
    allowed_variant_ids: [SW_70, SW_90],
    ...over,
  };
}

describe("kitPriceOverrides", () => {
  it("collects overrides from the armed rule", () => {
    const rules = [rule({ price_overrides: { [SW_70]: 150 } })];
    expect(kitPriceOverrides(rules, PURPLE)).toEqual({ [SW_70]: 150 });
  });

  it("ignores rules armed by a different kit variant", () => {
    const purple = rule({ price_overrides: { [SW_70]: 150 } });
    const trash = rule({
      condition_variant_id: TRASH,
      price_overrides: { [SW_70]: 180 },
    });
    expect(kitPriceOverrides([purple, trash], TRASH)).toEqual({ [SW_70]: 180 });
    expect(kitPriceOverrides([purple, trash], PURPLE)).toEqual({
      [SW_70]: 150,
    });
  });

  it("returns nothing when no kit variant is selected", () => {
    const rules = [rule({ price_overrides: { [SW_70]: 150 } })];
    expect(kitPriceOverrides(rules, null)).toEqual({});
    expect(kitPriceOverrides(rules, undefined)).toEqual({});
  });

  it("skips nullish and non-finite overrides", () => {
    const rules = [
      rule({ price_overrides: { [SW_70]: null, [SW_90]: Number.NaN } }),
    ];
    expect(kitPriceOverrides(rules, PURPLE)).toEqual({});
  });

  it("keeps a zero override", () => {
    const rules = [rule({ price_overrides: { [SW_70]: 0 } })];
    expect(kitPriceOverrides(rules, PURPLE)).toEqual({ [SW_70]: 0 });
  });
});

describe("resolveComponentContributions", () => {
  it("falls back to price_adjustment when no override exists", () => {
    const out = resolveComponentContributions(
      [{ variant_id: SW_70, price_adjustment: 150 }],
      {}
    );
    expect(out).toEqual([
      { variant_id: SW_70, price_adjustment: 150, overridden: false },
    ]);
  });

  it("uses the override when present", () => {
    const out = resolveComponentContributions(
      [{ variant_id: SW_70, price_adjustment: 150 }],
      { [SW_70]: 180 }
    );
    expect(out).toEqual([
      { variant_id: SW_70, price_adjustment: 180, overridden: true },
    ]);
  });

  it("treats a zero override as free, not as missing", () => {
    const out = resolveComponentContributions(
      [{ variant_id: SW_70, price_adjustment: 150 }],
      { [SW_70]: 0 }
    );
    expect(out[0]).toEqual({
      variant_id: SW_70,
      price_adjustment: 0,
      overridden: true,
    });
  });

  it("works with no overrides argument at all", () => {
    const out = resolveComponentContributions([
      { variant_id: SW_70, price_adjustment: 150 },
    ]);
    expect(out[0].price_adjustment).toBe(150);
  });
});

describe("resolveKitUnitPrice", () => {
  it("prices the owner's motivating case: 800 and 880", () => {
    const purpleRule = rule({ price_overrides: { [SW_70]: 150 } });
    const trashRule = rule({
      condition_variant_id: TRASH,
      price_overrides: { [SW_70]: 180 },
    });
    const rules = [purpleRule, trashRule];
    const components = [{ variant_id: SW_70, price_adjustment: 150 }];

    expect(
      resolveKitUnitPrice({
        basePrice: 650,
        kitVariant: { price_adjustment: 0 },
        components,
        overrides: kitPriceOverrides(rules, PURPLE),
      }).unitPrice
    ).toBe(800);

    expect(
      resolveKitUnitPrice({
        basePrice: 650,
        kitVariant: { price_adjustment: 50 },
        components,
        overrides: kitPriceOverrides(rules, TRASH),
      }).unitPrice
    ).toBe(880);
  });

  it("matches the pre-override formula when no override is set", () => {
    const result = resolveKitUnitPrice({
      basePrice: 650,
      kitVariant: { price_adjustment: 50 },
      components: [
        { variant_id: SW_70, price_adjustment: 150 },
        { variant_id: SW_90, price_adjustment: 30 },
      ],
    });
    expect(result.unitPrice).toBe(650 + 50 + 150 + 30);
    expect(result.kitAdjustment).toBe(50);
  });

  it("prices a kit with no variant selected from base + components", () => {
    expect(
      resolveKitUnitPrice({
        basePrice: 650,
        kitVariant: null,
        components: [{ variant_id: SW_70, price_adjustment: 150 }],
      }).unitPrice
    ).toBe(800);
  });

  it("sums overrides across several component groups", () => {
    const result = resolveKitUnitPrice({
      basePrice: 1000,
      kitVariant: { price_adjustment: 0 },
      components: [
        { variant_id: SW_70, price_adjustment: 150 },
        { variant_id: SW_90, price_adjustment: 30 },
      ],
      overrides: { [SW_70]: 150, [SW_90]: 0 },
    });
    expect(result.unitPrice).toBe(1150);
    expect(result.contributions.map((c) => c.overridden)).toEqual([true, true]);
  });

  it("tolerates a nullish variant adjustment and an empty selection", () => {
    expect(
      resolveKitUnitPrice({
        basePrice: 650,
        kitVariant: { price_adjustment: null },
        components: [],
      }).unitPrice
    ).toBe(650);
  });
});

describe("findDisallowedComponentVariant", () => {
  const rules = [
    rule({ allowed_variant_ids: [SW_70], price_overrides: { [SW_70]: 150 } }),
  ];

  it("accepts an allowed pairing", () => {
    expect(
      findDisallowedComponentVariant(rules, PURPLE, [
        { variant_id: SW_70, product_id: "switches-product" },
      ])
    ).toBeNull();
  });

  it("rejects a variant outside the allowed set", () => {
    expect(
      findDisallowedComponentVariant(rules, PURPLE, [
        { variant_id: SW_90, product_id: "switches-product" },
      ])
    ).toBe(SW_90);
  });

  it("only judges the rule's own target product", () => {
    expect(
      findDisallowedComponentVariant(rules, PURPLE, [
        { variant_id: SW_90, product_id: "a-different-product" },
      ])
    ).toBeNull();
  });

  it("does not apply rules armed by another kit variant", () => {
    expect(
      findDisallowedComponentVariant(rules, TRASH, [
        { variant_id: SW_90, product_id: "switches-product" },
      ])
    ).toBeNull();
  });

  it("is permissive when the kit has no variant selected", () => {
    expect(
      findDisallowedComponentVariant(rules, null, [
        { variant_id: SW_90, product_id: "switches-product" },
      ])
    ).toBeNull();
  });
});

describe("rulesByKitProduct", () => {
  const row = (over: Partial<RuleRow>): RuleRow => ({
    id: "rule-1",
    kit_product_id: "kit-product",
    condition_variant_id: PURPLE,
    target_component_product_id: "switches-product",
    component_variant_rule_allowed: [],
    ...over,
  });

  it("flattens allowed pairs and their overrides, grouped by kit product", () => {
    const grouped = rulesByKitProduct([
      row({
        component_variant_rule_allowed: [
          { variant_id: SW_70, price_override: 150 },
          { variant_id: SW_90, price_override: null },
        ],
      }),
    ]);
    const rules = grouped.get("kit-product");
    expect(rules).toHaveLength(1);
    expect(rules![0].allowed_variant_ids).toEqual([SW_70, SW_90]);
    expect(rules![0].price_overrides).toEqual({ [SW_70]: 150, [SW_90]: null });
  });

  it("normalises a NUMERIC string override to a number", () => {
    const grouped = rulesByKitProduct([
      row({
        component_variant_rule_allowed: [
          { variant_id: SW_70, price_override: "180" },
        ],
      }),
    ]);
    expect(grouped.get("kit-product")![0].price_overrides![SW_70]).toBe(180);
  });

  it("treats a null nested array as no allowed variants", () => {
    const grouped = rulesByKitProduct([
      row({ component_variant_rule_allowed: null }),
    ]);
    expect(grouped.get("kit-product")![0].allowed_variant_ids).toEqual([]);
    expect(grouped.get("kit-product")![0].price_overrides).toEqual({});
  });

  it("keeps a zero override distinct from null", () => {
    const grouped = rulesByKitProduct([
      row({
        component_variant_rule_allowed: [
          { variant_id: SW_70, price_override: 0 },
        ],
      }),
    ]);
    expect(grouped.get("kit-product")![0].price_overrides![SW_70]).toBe(0);
  });

  it("prices 800 and 880 straight off DB rows", () => {
    const grouped = rulesByKitProduct([
      row({
        condition_variant_id: PURPLE,
        component_variant_rule_allowed: [
          { variant_id: SW_70, price_override: 150 },
        ],
      }),
      row({
        id: "rule-2",
        condition_variant_id: TRASH,
        component_variant_rule_allowed: [
          { variant_id: SW_70, price_override: 180 },
        ],
      }),
    ]);
    const kitRules = grouped.get("kit-product") ?? [];
    const components = [{ variant_id: SW_70, price_adjustment: 150 }];

    expect(
      resolveKitUnitPrice({
        basePrice: 650,
        kitVariant: { price_adjustment: 0 },
        components,
        overrides: kitPriceOverrides(kitRules, PURPLE),
      }).unitPrice
    ).toBe(800);
    expect(
      resolveKitUnitPrice({
        basePrice: 650,
        kitVariant: { price_adjustment: 50 },
        components,
        overrides: kitPriceOverrides(kitRules, TRASH),
      }).unitPrice
    ).toBe(880);
  });

  it("still rejects a pairing that the DB row forbids", () => {
    const grouped = rulesByKitProduct([
      row({
        component_variant_rule_allowed: [
          { variant_id: SW_70, price_override: 150 },
        ],
      }),
    ]);
    expect(
      findDisallowedComponentVariant(grouped.get("kit-product") ?? [], PURPLE, [
        { variant_id: SW_90, product_id: "switches-product" },
      ])
    ).toBe(SW_90);
  });
});

// Every rule in the live catalogue is keyed on a COMPONENT variant, not the
// kit's own variant — e.g. YOK Switches keys off "Purple" from its Version
// component. These cover that shape so it can't silently stop matching.
describe("component-keyed rule conditions", () => {
  const YOK_VERSION = "var-purple";
  const YOK_TRASH = "var-trash";
  const PACK_70 = "pack-70";
  const PACK_90 = "pack-90";
  const PACK_100 = "pack-100";
  const VERSION_PRODUCT = "yok-version";
  const PACK_PRODUCT = "yok-pack";

  // Mirrors the two live rules: Trash allows all three packs, Purple excludes x100.
  const yokRows: RuleRow[] = [
    {
      id: "r-trash",
      kit_product_id: "yok",
      condition_variant_id: YOK_TRASH,
      target_component_product_id: PACK_PRODUCT,
      component_variant_rule_allowed: [
        { variant_id: PACK_70, price_override: null },
        { variant_id: PACK_90, price_override: null },
        { variant_id: PACK_100, price_override: null },
      ],
    },
    {
      id: "r-purple",
      kit_product_id: "yok",
      condition_variant_id: YOK_VERSION,
      target_component_product_id: PACK_PRODUCT,
      component_variant_rule_allowed: [
        { variant_id: PACK_70, price_override: 150000 },
      ],
    },
  ];

  const rules = () => toRulesByProductId(yokRows)["yok"] ?? [];

  it("rejects x100 when the Version component is Purple", () => {
    expect(
      findDisallowedComponentVariant(
        rules(),
        [YOK_VERSION],
        [
          { variant_id: YOK_VERSION, product_id: VERSION_PRODUCT },
          { variant_id: PACK_100, product_id: PACK_PRODUCT },
        ]
      )
    ).toBe(PACK_100);
  });

  it("allows x100 when the Version component is Trash Panda", () => {
    expect(
      findDisallowedComponentVariant(
        rules(),
        [YOK_TRASH],
        [
          { variant_id: YOK_TRASH, product_id: VERSION_PRODUCT },
          { variant_id: PACK_100, product_id: PACK_PRODUCT },
        ]
      )
    ).toBeNull();
  });

  it("still accepts the kit's own variant as a condition source", () => {
    expect(
      findDisallowedComponentVariant(
        rules(),
        [YOK_TRASH],
        [{ variant_id: PACK_100, product_id: PACK_PRODUCT }]
      )
    ).toBeNull();
  });

  it("picks up overrides keyed on the Version component", () => {
    const overrides = kitPriceOverrides(rules(), [YOK_VERSION]);
    expect(overrides[PACK_70]).toBe(150000);
    // Trash has no overrides, so its packs fall back to their own price.
    expect(kitPriceOverrides(rules(), [YOK_TRASH])).toEqual({});
  });

  it("prices the same pack differently per Version selection", () => {
    const components = [
      { variant_id: YOK_VERSION, price_adjustment: 600000 },
      { variant_id: PACK_70, price_adjustment: 0 },
    ];
    const purple = resolveKitUnitPrice({
      basePrice: 0,
      kitVariant: null,
      components,
      overrides: kitPriceOverrides(rules(), [YOK_VERSION]),
    });
    const trash = resolveKitUnitPrice({
      basePrice: 0,
      kitVariant: null,
      components: [
        { variant_id: YOK_TRASH, price_adjustment: 700000 },
        { variant_id: PACK_70, price_adjustment: 0 },
      ],
      overrides: kitPriceOverrides(rules(), [YOK_TRASH]),
    });

    // Purple + x70 = 600k version + 150k override.
    expect(purple.unitPrice).toBe(750000);
    // Trash + x70 = 700k version + 0 (no override, own adjustment).
    expect(trash.unitPrice).toBe(700000);
  });
});

describe("effectiveContribution", () => {
  const v = { price_adjustment: 200000 };

  it("prefers the override over the variant's own price", () => {
    expect(effectiveContribution(150000, v)).toBe(150000);
  });

  it("falls back to the variant's own price for null/undefined", () => {
    expect(effectiveContribution(null, v)).toBe(200000);
    expect(effectiveContribution(undefined, v)).toBe(200000);
  });

  it("treats 0 as a real free contribution, not a fallback", () => {
    expect(effectiveContribution(0, v)).toBe(0);
  });
});

describe("findPriceLadderInversion", () => {
  // The real YOK Switches Pack ladder.
  const x70 = { id: "70", variant_name: "x70", price_adjustment: 0 };
  const x90 = { id: "90", variant_name: "x90", price_adjustment: 200000 };
  const x100 = { id: "100", variant_name: "x100", price_adjustment: 300000 };

  it("reports nothing when the ladder ascends", () => {
    expect(
      findPriceLadderInversion([x70, x90, x100], (v) => v.price_adjustment)
    ).toBeNull();
  });

  it("reports nothing when overrides preserve the order", () => {
    const overrides: Record<string, number> = { 70: 50000, 90: 250000 };
    expect(
      findPriceLadderInversion(
        [x70, x90, x100],
        (v) => overrides[v.id] ?? v.price_adjustment
      )
    ).toBeNull();
  });

  it("flags an override that lifts a cheap variant past a pricier one", () => {
    const overrides: Record<string, number> = { 70: 250000 };
    const found = findPriceLadderInversion(
      [x70, x90, x100],
      (v) => overrides[v.id] ?? v.price_adjustment
    );
    expect(found?.cheaper.id).toBe("70");
    expect(found?.pricier.id).toBe("90");
  });

  it("ignores equal prices rather than reporting a false inversion", () => {
    expect(findPriceLadderInversion([x70, x90], () => 100000)).toBeNull();
  });

  it("handles a single variant and an empty list", () => {
    expect(
      findPriceLadderInversion([x70], (v) => v.price_adjustment)
    ).toBeNull();
    expect(findPriceLadderInversion([], () => 0)).toBeNull();
  });

  it("is unaffected by input order", () => {
    const overrides: Record<string, number> = { 70: 250000 };
    const a = findPriceLadderInversion(
      [x70, x90, x100],
      (v) => overrides[v.id] ?? v.price_adjustment
    );
    const b = findPriceLadderInversion(
      [x100, x90, x70],
      (v) => overrides[v.id] ?? v.price_adjustment
    );
    expect(a?.cheaper.id).toBe(b?.cheaper.id);
    expect(a?.pricier.id).toBe(b?.pricier.id);
  });
});
