import { describe, expect, it } from "vitest";
import {
  assertQuantityAvailable,
  loadAvailabilitySnapshot,
  type AvailabilitySnapshot,
} from "@/modules/cart/server/availability";

/**
 * Interface tests for the deep availability module. They cross the same seam
 * callers use: a plain AvailabilitySnapshot in, an AvailabilityResult out.
 * No Supabase fake needed for the rules — the loader's query contract is
 * covered by the orchestration tests in cart-service.test.ts.
 */

function snapshot(
  overrides: Partial<AvailabilitySnapshot> = {}
): AvailabilitySnapshot {
  return {
    product: { productType: "standard", stock: 10, max: null },
    line: { variantId: null, childVariantIds: [], currentQty: 0 },
    variantStock: {},
    committed: {},
    ...overrides,
  };
}

describe("assertQuantityAvailable — standard base", () => {
  it("allows qty within product stock", () => {
    const s = snapshot({
      product: { productType: "standard", stock: 10, max: null },
    });
    expect(assertQuantityAvailable(s, 10)).toEqual({ ok: true });
  });

  it("rejects qty over product stock with the product's available", () => {
    const s = snapshot({
      product: { productType: "standard", stock: 3, max: null },
    });
    expect(assertQuantityAvailable(s, 4)).toEqual({
      ok: false,
      kind: "stock",
      resource: "product",
      available: 3,
    });
  });

  it("enforces max_quantity for standard products", () => {
    const s = snapshot({
      product: { productType: "standard", stock: 10, max: 2 },
    });
    expect(assertQuantityAvailable(s, 3)).toEqual({
      ok: false,
      kind: "max",
      max: 2,
    });
  });
});

describe("assertQuantityAvailable — standard variant", () => {
  it("allows qty within the variant's own stock", () => {
    const s = snapshot({
      product: { productType: "standard", stock: 100, max: null },
      line: { variantId: "v1", childVariantIds: [], currentQty: 0 },
      variantStock: { v1: 5 },
    });
    expect(assertQuantityAvailable(s, 5)).toEqual({ ok: true });
  });

  it("rejects qty over the variant stock even when product stock is larger", () => {
    const s = snapshot({
      product: { productType: "standard", stock: 100, max: null },
      line: { variantId: "v1", childVariantIds: [], currentQty: 0 },
      variantStock: { v1: 2 },
    });
    expect(assertQuantityAvailable(s, 3)).toEqual({
      ok: false,
      kind: "stock",
      resource: "v1",
      available: 2,
    });
  });

  it("ignores NULL product stock when the line has a variant (reported bug)", () => {
    // Admin left the product stock box blank → products.stock_quantity IS NULL.
    // The variant owns the pool, so a stocked variant must be addable.
    const s = snapshot({
      product: { productType: "standard", stock: null, max: null },
      line: { variantId: "v1", childVariantIds: [], currentQty: 0 },
      variantStock: { v1: 7 },
    });
    expect(assertQuantityAvailable(s, 7)).toEqual({ ok: true });
  });

  it("rejects over the variant even when product stock is NULL", () => {
    const s = snapshot({
      product: { productType: "standard", stock: null, max: null },
      line: { variantId: "v1", childVariantIds: [], currentQty: 0 },
      variantStock: { v1: 2 },
    });
    expect(assertQuantityAvailable(s, 3)).toEqual({
      ok: false,
      kind: "stock",
      resource: "v1",
      available: 2,
    });
  });

  it("treats NULL product stock as 0 for a variant-less line", () => {
    const s = snapshot({
      product: { productType: "standard", stock: null, max: null },
      line: { variantId: null, childVariantIds: [], currentQty: 0 },
      variantStock: {},
    });
    expect(assertQuantityAvailable(s, 1)).toEqual({
      ok: false,
      kind: "stock",
      resource: "product",
      available: 0,
    });
  });
});

describe("assertQuantityAvailable — kit", () => {
  it("allows qty within every selected component variant's stock", () => {
    const s = snapshot({
      product: { productType: "kit", stock: 0, max: null },
      line: { variantId: null, childVariantIds: ["a", "b"], currentQty: 1 },
      variantStock: { a: 3, b: 2 },
      committed: {},
    });
    expect(assertQuantityAvailable(s, 2)).toEqual({ ok: true });
  });

  it("rejects qty over the bottleneck variant with that variant's available", () => {
    const s = snapshot({
      product: { productType: "kit", stock: 0, max: null },
      line: { variantId: null, childVariantIds: ["a", "b"], currentQty: 1 },
      variantStock: { a: 10, b: 1 },
      committed: {},
    });
    expect(assertQuantityAvailable(s, 2)).toEqual({
      ok: false,
      kind: "stock",
      resource: "b",
      available: 1,
    });
  });

  it("ignores products.stock_quantity entirely for kits (NULL in DB)", () => {
    const s = snapshot({
      product: { productType: "kit", stock: 0, max: null },
      line: { variantId: null, childVariantIds: ["a"], currentQty: 0 },
      variantStock: { a: 5 },
      committed: {},
    });
    expect(assertQuantityAvailable(s, 5)).toEqual({ ok: true });
  });

  it("counts other kit lines' committed usage of the same variant", () => {
    const s = snapshot({
      product: { productType: "kit", stock: 0, max: null },
      line: { variantId: null, childVariantIds: ["a"], currentQty: 2 },
      variantStock: { a: 10 },
      committed: { a: 3 }, // another kit line holds 3 units of variant a
    });
    // target 7 + committed 3 = 10, exactly at stock
    expect(assertQuantityAvailable(s, 7)).toEqual({ ok: true });
    expect(assertQuantityAvailable(s, 8)).toEqual({
      ok: false,
      kind: "stock",
      resource: "a",
      available: 10,
    });
  });

  it("counts a variant appearing in two component groups with multiplicity", () => {
    const s = snapshot({
      product: { productType: "kit", stock: 0, max: null },
      line: { variantId: null, childVariantIds: ["a", "a"], currentQty: 1 },
      variantStock: { a: 4 },
      committed: {},
    });
    // one kit consumes 2 units of a (two groups) → max qty is 2
    expect(assertQuantityAvailable(s, 2)).toEqual({ ok: true });
    expect(assertQuantityAvailable(s, 3)).toEqual({
      ok: false,
      kind: "stock",
      resource: "a",
      available: 4,
    });
  });

  it("validates a kit component row addressed directly by its own variant", () => {
    const s = snapshot({
      product: { productType: "kit", stock: 0, max: null },
      line: { variantId: "a", childVariantIds: [], currentQty: 1 },
      variantStock: { a: 1 },
      committed: {},
    });
    expect(assertQuantityAvailable(s, 1)).toEqual({ ok: true });
    expect(assertQuantityAvailable(s, 2)).toEqual({
      ok: false,
      kind: "stock",
      resource: "a",
      available: 1,
    });
  });

  it("blocks growth of a kit parent whose component rows are missing", () => {
    const s = snapshot({
      product: { productType: "kit", stock: 0, max: null },
      line: { variantId: null, childVariantIds: [], currentQty: 1 },
      variantStock: {},
      committed: {},
    });
    expect(assertQuantityAvailable(s, 2)).toEqual({
      ok: false,
      kind: "not_configured",
    });
  });
});

describe("assertQuantityAvailable — cross-cutting", () => {
  it("always allows decreasing a line, regardless of stock", () => {
    const s = snapshot({
      product: { productType: "standard", stock: 1, max: 1 },
      line: { variantId: null, childVariantIds: [], currentQty: 5 },
    });
    expect(assertQuantityAvailable(s, 1)).toEqual({ ok: true });
  });

  it("enforces max_quantity for kits on increase", () => {
    const s = snapshot({
      product: { productType: "kit", stock: 0, max: 2 },
      line: { variantId: null, childVariantIds: ["a"], currentQty: 2 },
      variantStock: { a: 100 },
      committed: {},
    });
    expect(assertQuantityAvailable(s, 3)).toEqual({
      ok: false,
      kind: "max",
      max: 2,
    });
  });

  it("checks max before variant stock (per-order cap wins)", () => {
    const s = snapshot({
      product: { productType: "kit", stock: 0, max: 2 },
      line: { variantId: null, childVariantIds: ["a"], currentQty: 0 },
      variantStock: { a: 1 },
      committed: {},
    });
    expect(assertQuantityAvailable(s, 3)).toEqual({
      ok: false,
      kind: "max",
      max: 2,
    });
  });
});

describe("loadAvailabilitySnapshot — adapter contract", () => {
  // Minimal fake standing in for the Supabase builder chain, mirroring the
  // query shapes the loader emits. Full orchestration is covered by
  // cart-service.test.ts; this pins the snapshot shape end to end.
  function fakeClient(rows: {
    products?: Array<Record<string, unknown>>;
    product_variants?: Array<Record<string, unknown>>;
    cart_items?: Array<Record<string, unknown>>;
  }) {
    const match = (table: string, eqs: Record<string, unknown>) => {
      const list = rows[table as keyof typeof rows] ?? [];
      return list.filter((r) =>
        Object.entries(eqs).every(([col, val]) => {
          if (Array.isArray(val)) return (val as unknown[]).includes(r[col]);
          if (val === null) return r[col] == null;
          return r[col] === val;
        })
      );
    };
    interface FakeBuilder {
      select(): FakeBuilder;
      eq(col: string, val: unknown): FakeBuilder;
      is(col: string): FakeBuilder;
      in(col: string, vals: unknown[]): FakeBuilder;
      not(): FakeBuilder;
      order(): FakeBuilder;
      single(): FakeBuilder;
      maybeSingle(): FakeBuilder;
      then(resolve: (v: { data: unknown; error: null }) => unknown): unknown;
    }

    return {
      from: (table: string): FakeBuilder => {
        // Fresh builder per from() so filters never bleed between queries.
        const eqs: Record<string, unknown> = {};
        const builder: FakeBuilder = {
          select: () => builder,
          eq: (col, val) => {
            eqs[col] = val;
            return builder;
          },
          is: (col) => builder.eq(col, null),
          in: (col, vals) => builder.eq(col, vals),
          not: () => builder,
          order: () => builder,
          single: () => builder,
          maybeSingle: () => builder,
          then: (resolve) => {
            const matched =
              table === "products"
                ? (match(table, eqs)[0] ?? null)
                : match(table, eqs);
            return resolve({ data: matched, error: null });
          },
        };
        return builder;
      },
    };
  }

  it("builds a kit snapshot excluding the line being changed", async () => {
    const client = fakeClient({
      products: [
        {
          id: "kit",
          stock_quantity: null,
          max_quantity: null,
          product_type: "kit",
        },
      ],
      product_variants: [
        { id: "a", stock_quantity: 5 },
        { id: "b", stock_quantity: 5 },
      ],
      cart_items: [
        {
          id: "parent-1",
          cart_id: "cart-1",
          parent_cart_item_id: null,
          quantity: 2,
        },
        {
          id: "child-1",
          cart_id: "cart-1",
          parent_cart_item_id: "parent-1",
          variant_id: "a",
          quantity: 1,
        },
        {
          id: "child-2",
          cart_id: "cart-1",
          parent_cart_item_id: "parent-1",
          variant_id: "b",
          quantity: 1,
        },
        {
          id: "parent-2",
          cart_id: "cart-1",
          parent_cart_item_id: null,
          quantity: 1,
        },
        {
          id: "child-3",
          cart_id: "cart-1",
          parent_cart_item_id: "parent-2",
          variant_id: "a",
          quantity: 1,
        },
      ],
    });

    const s = await loadAvailabilitySnapshot(client as never, {
      cartId: "cart-1",
      productId: "kit",
      childVariantIds: ["a", "b"],
      excludeLineId: "parent-1",
      currentQty: 2,
    });

    // NULL is preserved (kits carry no own stock) — not coerced to 0, since
    // stock: number | null is the contract that lets variant lines bypass it.
    expect(s.product).toEqual({ productType: "kit", stock: null, max: null });
    expect(s.variantStock).toEqual({ a: 5, b: 5 });
    // parent-1 (qty 2 × a, b) excluded; only parent-2's single unit of a remains
    expect(s.committed).toEqual({ a: 1 });
    expect(s.line).toEqual({
      variantId: null,
      childVariantIds: ["a", "b"],
      currentQty: 2,
    });

    // target 4 + committed a:1 = 5 ≤ 5 OK; target 5 → 6 > 5 reject
    expect(assertQuantityAvailable(s, 4)).toEqual({ ok: true });
    expect(assertQuantityAvailable(s, 5)).toEqual({
      ok: false,
      kind: "stock",
      resource: "a",
      available: 5,
    });
  });
});
