import { describe, expect, it } from "vitest";
import { resolveEffectiveStock, resolveKitStockById } from "./stock";
import type { StockNode } from "./stock";

const noKitStock = new Map<string, number>();

describe("resolveEffectiveStock", () => {
  it("standard product without variants uses the product row", () => {
    expect(
      resolveEffectiveStock({
        productType: "standard",
        productId: "p1",
        productStock: 7,
        variants: [],
        kitStockById: noKitStock,
      })
    ).toBe(7);
  });

  it("standard product treats a NULL product row as 0 when variant-less", () => {
    expect(
      resolveEffectiveStock({
        productType: "standard",
        productId: "p1",
        productStock: null,
        variants: [],
        kitStockById: noKitStock,
      })
    ).toBe(0);
  });

  it("standard product with variants sums them, ignoring the product row", () => {
    // Variant-authoritative: the product row may be NULL/unmanaged while
    // variants carry stock — /shop must not show "sold out" for it.
    expect(
      resolveEffectiveStock({
        productType: "standard",
        productId: "p1",
        productStock: null,
        variants: [{ stock_quantity: 3 }, { stock_quantity: 4 }],
        kitStockById: noKitStock,
      })
    ).toBe(7);
  });

  it("standard product with variants is 0 only when all variants are 0", () => {
    expect(
      resolveEffectiveStock({
        productType: "standard",
        productId: "p1",
        productStock: 99,
        variants: [{ stock_quantity: 0 }, { stock_quantity: 0 }],
        kitStockById: noKitStock,
      })
    ).toBe(0);
  });

  it("component product sums its variants (0 without any)", () => {
    expect(
      resolveEffectiveStock({
        productType: "component",
        productId: "p1",
        productStock: 10,
        variants: [{ stock_quantity: 2 }],
        kitStockById: noKitStock,
      })
    ).toBe(2);
    expect(
      resolveEffectiveStock({
        productType: "component",
        productId: "p1",
        productStock: 10,
        variants: [],
        kitStockById: noKitStock,
      })
    ).toBe(0);
  });

  it("kit prefers the computed kit stock (min across required children)", () => {
    const kitStockById = new Map([["kit1", 4]]);
    expect(
      resolveEffectiveStock({
        productType: "kit",
        productId: "kit1",
        productStock: 0,
        variants: [{ stock_quantity: 9 }],
        kitStockById,
      })
    ).toBe(4);
  });

  it("kit falls back to min across its own variants, then the product row", () => {
    expect(
      resolveEffectiveStock({
        productType: "kit",
        productId: "kit1",
        productStock: 5,
        variants: [{ stock_quantity: 6 }, { stock_quantity: 2 }],
        kitStockById: noKitStock,
      })
    ).toBe(2);
    expect(
      resolveEffectiveStock({
        productType: "kit",
        productId: "kit1",
        productStock: 5,
        variants: [],
        kitStockById: noKitStock,
      })
    ).toBe(5);
  });

  it("defaults an unknown product type to the standard rule", () => {
    expect(
      resolveEffectiveStock({
        productType: null,
        productId: "p1",
        productStock: 3,
        variants: [],
        kitStockById: noKitStock,
      })
    ).toBe(3);
  });
});

// ─── resolveKitStockById ──────────────────────────────────────────────────────

describe("resolveKitStockById", () => {
  const node = (
    id: string,
    product_type: string,
    stock_quantity: number | null,
    variantStocks: number[],
  ): StockNode => ({ id, product_type, stock_quantity, variantStocks });

  it("takes the minimum across required components", () => {
    // Each component's own stock is the SUM of its variants (5+4=9, 2+1=3),
    // then the kit takes the min across those. Not min-of-variants.
    const links = [
      { parent_product_id: "kit", component_product_id: "a", is_required: true },
      { parent_product_id: "kit", component_product_id: "b", is_required: true },
    ];
    const nodes = new Map([
      ["a", node("a", "component", null, [5, 4])],
      ["b", node("b", "component", null, [2, 1])],
    ]);
    expect(resolveKitStockById({ links, nodes }).get("kit")).toBe(3);
  });

  it("ignores optional components", () => {
    // Accessories must not gate whether the kit is buildable.
    const links = [
      { parent_product_id: "kit", component_product_id: "a", is_required: true },
      { parent_product_id: "kit", component_product_id: "opt", is_required: false },
    ];
    const nodes = new Map([
      ["a", node("a", "component", null, [4])],
      ["opt", node("opt", "component", null, [0])],
    ]);
    expect(resolveKitStockById({ links, nodes }).get("kit")).toBe(4);
  });

  it("a variant-less component child is 0 even with a product row", () => {
    // Variant-authoritative, and deliberately the same on both surfaces. A
    // component with no variants has no sellable stock; its product row is not
    // a fallback. (The old /shop code summed zero variants here too, so this
    // case already agreed — the real split was a kit child, tested below.)
    const links = [
      { parent_product_id: "kit", component_product_id: "a", is_required: true },
    ];
    const nodes = new Map([["a", node("a", "component", 7, [])]]);
    expect(resolveKitStockById({ links, nodes }).get("kit")).toBe(0);
  });

  it("treats a missing or inactive child as zero", () => {
    const links = [
      { parent_product_id: "kit", component_product_id: "gone", is_required: true },
    ];
    expect(resolveKitStockById({ links, nodes: new Map() }).get("kit")).toBe(0);
  });

  it("resolves a kit child through ITS components, not its own variants", () => {
    // The regression: /shop summed the child kit's variants (2+1 = 3) while
    // /shop/[slug] collapsed it to min(2,1) = 1. The wrapper's real stock is
    // the min across the child's own required components (= 2).
    const links = [
      { parent_product_id: "outer", component_product_id: "inner", is_required: true },
      { parent_product_id: "inner", component_product_id: "plate", is_required: true },
      { parent_product_id: "inner", component_product_id: "pcb", is_required: true },
    ];
    const nodes = new Map([
      ["inner", node("inner", "kit", null, [2, 1])],
      ["plate", node("plate", "component", null, [4])],
      ["pcb", node("pcb", "component", null, [2])],
    ]);
    expect(resolveKitStockById({ links, nodes }).get("outer")).toBe(2);
    expect(resolveKitStockById({ links, nodes }).get("inner")).toBe(2);
  });

  it("a self-referential component resolves to 0 without hanging", () => {
    // Live data once had `2000 Mini SE - Extra` listed as its own required
    // component. It must terminate and report sold out on every surface rather
    // than recursing forever or inventing a number.
    const links = [
      { parent_product_id: "self", component_product_id: "self", is_required: true },
    ];
    const nodes = new Map([["self", node("self", "kit", null, [2, 1])]]);
    expect(resolveKitStockById({ links, nodes }).get("self")).toBe(0);
  });

  it("a two-node cycle also resolves to 0 without hanging", () => {
    const links = [
      { parent_product_id: "x", component_product_id: "y", is_required: true },
      { parent_product_id: "y", component_product_id: "x", is_required: true },
    ];
    const nodes = new Map([
      ["x", node("x", "kit", null, [1])],
      ["y", node("y", "kit", null, [1])],
    ]);
    const out = resolveKitStockById({ links, nodes });
    expect(out.get("x")).toBe(0);
    expect(out.get("y")).toBe(0);
  });

  it("a kit with no required components has no entry", () => {
    // No entry means resolveEffectiveStock falls back to the kit's own
    // variants/product row, which is the pre-existing behaviour.
    expect(
      resolveKitStockById({
        links: [{ parent_product_id: "kit", component_product_id: "o", is_required: false }],
        nodes: new Map([["o", node("o", "component", null, [3])]]),
      }).has("kit"),
    ).toBe(false);
  });

  it("agrees with resolveEffectiveStock when fed its own output", () => {
    // Parity guard: both stock surfaces call resolveKitStockById and then pass
    // the map to resolveEffectiveStock. This asserts the two never disagree
    // for the same inputs — the failure that produced "listing says sold out,
    // product page says in stock".
    const links = [
      { parent_product_id: "kit", component_product_id: "a", is_required: true },
      { parent_product_id: "kit", component_product_id: "b", is_required: true },
    ];
    const nodes = new Map([
      ["a", node("a", "component", null, [5, 4])],
      ["b", node("b", "component", null, [3, 9])],
    ]);
    const kitStockById = resolveKitStockById({ links, nodes });
    const kitStock = resolveEffectiveStock({
      productType: "kit",
      productId: "kit",
      productStock: null,
      variants: [],
      kitStockById,
    });
    expect(kitStock).toBe(kitStockById.get("kit"));
  });
});
