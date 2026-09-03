import { beforeEach, describe, expect, it } from "vitest";
import {
  MaxLimitExceededError,
  StockExceededError,
  updateCartItemQuantity,
  upsertCartItem,
} from "@/lib/cart-service";

/**
 * Unit tests for the server-side stock/max enforcement in cart-service.ts.
 *
 * Covers the "kit bypass" bug: kit inventory is held on
 * product_variants.stock_quantity, and upserting a kit must never exceed the
 * variant's stock across the whole cart (global semantics) nor the product's
 * per-customer max_quantity.
 */

type Row = Record<string, unknown>;

// Sentinel used by awaitable results to distinguish "no rows" from a query
// that legitimately matched nothing.
const EMPTY: Row[] = [];

interface MockState {
  products: Row[];
  product_variants: Row[];
  cart_items: Row[];
  insertCalls: Array<{ table: string; rows: Row[] }>;
  updateCalls: Array<{ table: string; id: string; set: Row }>;
}

function resolved<T>(data: T, error: unknown = null) {
  return {
    then: (resolve: (r: { data: T; error: unknown }) => unknown) =>
      resolve({ data, error }),
  };
}

function equery(rows: Row[], eqs: Record<string, unknown>): Row[] {
  return rows.filter((r) =>
    Object.entries(eqs).every(([col, val]) => {
      if (val === null) return r[col] == null;
      if (Array.isArray(val)) return (val as unknown[]).includes(r[col]);
      return r[col] === val;
    })
  );
}

/**
 * Fake Supabase client for cart-service.
 *
 * Query dispatch is driven by the filter columns recorded on the builder:
 *   - getProductEffectiveLimit: products, .single()
 *   - getVariantStock:          product_variants, .in("id", ...)
 *   - findExistingParentMatch:  cart_items (has .eq("product_id"))
 *   - getCartVariantUsage:      cart_items (only .eq("cart_id"), no product_id)
 *   - simple line match:        cart_items (.eq("variant_id") or product+variant)
 *
 * `.single()`/`.maybeSingle()` resolve to a row object (or null); list queries
 * resolve to an array. `.insert()` and `.update().eq()` are recorded.
 */
function makeClient(): { client: unknown; state: MockState } {
  const state: MockState = {
    products: [],
    product_variants: [],
    cart_items: [],
    insertCalls: [],
    updateCalls: [],
  };

  const client = {
    from: (table: string) => {
      const eqs: Record<string, unknown> = {};
      let mode: "single" | "maybeSingle" | "list" = "list";

      interface Builder {
        select: () => Builder;
        eq: (col: string, val: unknown) => Builder;
        is: (col: string) => Builder;
        in: (col: string, vals: unknown[]) => Builder;
        not: () => Builder;
        order: () => Builder;
        single: () => Builder;
        maybeSingle: () => Builder;
        insert(
          rows: Row[] | Row
        ): { then: (r: (x: { data: Row[]; error: unknown }) => unknown) => unknown };
        update(set: Row): {
          eq(
            col: string,
            id: string
          ): { then: (r: (x: { data: null; error: unknown }) => unknown) => unknown };
        };
        then: (r: (x: { data: unknown; error: unknown }) => unknown) => unknown;
      }

      const builder: Builder = {
        select: () => builder,
        eq: (col: string, val: unknown) => {
          eqs[col] = val;
          return builder;
        },
        is: (col: string) => {
          eqs[col] = null;
          return builder;
        },
        in: (col: string, vals: unknown[]) => {
          eqs[col] = vals as string[];
          return builder;
        },
        not: () => builder,
        order: () => builder,
        single: () => {
          mode = "single";
          return builder;
        },
        maybeSingle: () => {
          mode = "maybeSingle";
          return builder;
        },
        insert: (rows: Row[] | Row) => {
          const arr = Array.isArray(rows) ? rows : [rows];
          state.insertCalls.push({ table, rows: arr });
          return resolved(arr);
        },
        update: (set: Row) => ({
          eq: (_col: string, id: string) => {
            state.updateCalls.push({ table, id: String(id), set });
            return resolved(null);
          },
        }),
        then: (resolve) => resolve(value()),
      };

      const rows = () => state[table as keyof MockState] as Row[];

      const matches = (): Row[] => {
        if (table === "products") {
          return equery(rows(), eqs).slice(0, 1);
        }
        if (table === "product_variants") {
          const ids = eqs["id"];
          if (Array.isArray(ids)) return rows().filter((r) => (ids as string[]).includes(r.id as string));
          return equery(rows(), eqs);
        }
        // cart_items
        if (eqs["product_id"] !== undefined) {
          // findExistingParentMatch parent lookup (single parent for product).
          return equery(rows(), { ...eqs, parent_cart_item_id: null });
        }
        if (eqs["parent_cart_item_id"] !== undefined) {
          // children of a parent — either a scalar (.eq) or an array (.in).
          const parentVal = eqs["parent_cart_item_id"];
          if (Array.isArray(parentVal)) {
            return rows().filter(
              (r) =>
                r.variant_id != null &&
                (parentVal as string[]).includes(r.parent_cart_item_id as string)
            );
          }
          return rows().filter((r) => r.parent_cart_item_id === parentVal);
        }
        if (eqs["cart_id"] !== undefined) {
          // getCartVariantUsage parent lookup.
          return rows().filter((r) => r.cart_id === eqs["cart_id"] && r.parent_cart_item_id == null);
        }
        return equery(rows(), eqs);
      };

      const value = (): { data: Row[] | Row | null; error: unknown } => {
        const data = matches();
        if (mode === "single" || mode === "maybeSingle") {
          return { data: data[0] ?? (mode === "maybeSingle" ? null : undefined), error: null };
        }
        return { data, error: null };
      };

      const awaited = Object.assign(builder, {
        then: (resolve: (r: { data: unknown; error: unknown }) => unknown) =>
          resolve(value()),
      });
      return awaited;
    },
  };

  return { client, state };
}

beforeEach(() => {
  // no cross-test state needed
});

describe("upsertCartItem (kit)", () => {
  it("throws StockExceededError when the kit's component variant stock is exceeded across the cart", async () => {
    // Cart already has 5 units of the kit (parent quantity 5) whose child
    // variant only has stock 3 — exactly the reported bug.
    const { client, state } = makeClient();
    state.products = [
      { id: "kit", stock_quantity: null, max_quantity: null, product_type: "kit" },
    ];
    state.product_variants = [{ id: "v1", stock_quantity: 3 }];
    state.cart_items = [
      { id: "parent-1", cart_id: "cart-1", product_id: "kit", parent_cart_item_id: null, quantity: 5 },
      { id: "child-1", cart_id: "cart-1", product_id: "kit", parent_cart_item_id: "parent-1", variant_id: "v1", quantity: 1 },
    ];

    await expect(
      upsertCartItem(client as never, "cart-1", {
        product_id: "kit",
        components: [{ variant_id: "v1" }],
        quantity: 1,
      })
    ).rejects.toBeInstanceOf(StockExceededError);

    // No write must have happened.
    expect(state.insertCalls).toHaveLength(0);
    expect(state.updateCalls).toHaveLength(0);
  });

  it("throws MaxLimitExceededError when the proposed qty exceeds the product's per-customer max_quantity", async () => {
    const { client, state } = makeClient();
    state.products = [
      { id: "kit", stock_quantity: 100, max_quantity: 2, product_type: "kit" },
    ];
    // Plenty of variant stock; only the per-customer cap should block.
    state.product_variants = [{ id: "v1", stock_quantity: 100 }];
    // Existing line already at the cap.
    state.cart_items = [
      { id: "parent-1", cart_id: "cart-1", product_id: "kit", parent_cart_item_id: null, quantity: 2 },
      { id: "child-1", cart_id: "cart-1", product_id: "kit", parent_cart_item_id: "parent-1", variant_id: "v1", quantity: 1 },
    ];

    await expect(
      upsertCartItem(client as never, "cart-1", {
        product_id: "kit",
        components: [{ variant_id: "v1" }],
        quantity: 1,
      })
    ).rejects.toBeInstanceOf(MaxLimitExceededError);

    expect(state.insertCalls).toHaveLength(0);
    expect(state.updateCalls).toHaveLength(0);
  });

  it("allows a new kit line within variant stock and inserts parent + child rows", async () => {
    const { client, state } = makeClient();
    state.products = [
      { id: "kit", stock_quantity: null, max_quantity: null, product_type: "kit" },
    ];
    state.product_variants = [{ id: "v1", stock_quantity: 3 }];
    // No existing cart lines.
    state.cart_items = [];

    const res = await upsertCartItem(client as never, "cart-1", {
      product_id: "kit",
      components: [{ variant_id: "v1" }],
      quantity: 1,
    });

    expect(res.parentItemId).toBeDefined();
    // one parent insert + one child insert, same table.
    const parentInsert = state.insertCalls.find(
      (c) => c.table === "cart_items" && c.rows[0].parent_cart_item_id == null
    );
    const childInsert = state.insertCalls.find(
      (c) => c.table === "cart_items" && c.rows[0].parent_cart_item_id != null
    );
    expect(parentInsert).toBeDefined();
    expect(parentInsert!.rows[0].quantity).toBe(1);
    expect(childInsert).toBeDefined();
    expect(childInsert!.rows[0].variant_id).toBe("v1");
  });
});

describe("upsertCartItem (simple variant)", () => {
  it("throws StockExceededError when the simple product's variant stock is exceeded on an existing line", async () => {
    const { client, state } = makeClient();
    state.products = [
      { id: "prod", stock_quantity: 100, max_quantity: null, product_type: "standard" },
    ];
    state.product_variants = [{ id: "v1", stock_quantity: 2 }];
    state.cart_items = [
      { id: "line-1", cart_id: "cart-1", product_id: "prod", variant_id: "v1", parent_cart_item_id: null, quantity: 2 },
    ];

    await expect(
      upsertCartItem(client as never, "cart-1", {
        product_id: "prod",
        variant_id: "v1",
        quantity: 1,
      })
    ).rejects.toBeInstanceOf(StockExceededError);

    expect(state.updateCalls).toHaveLength(0);
  });
});

describe("updateCartItemQuantity (kit parent)", () => {
  it("throws StockExceededError when setting a kit parent qty that pushes a child variant over stock", async () => {
    const { client, state } = makeClient();
    // products.stock_quantity is NULL for kits — the variant (not the product)
    // gate must reject, reporting the variant's available stock.
    state.products = [
      { id: "kit", stock_quantity: null, max_quantity: null, product_type: "kit" },
    ];
    state.product_variants = [{ id: "v1", stock_quantity: 2 }];
    // Target qty 5 for the parent, variant stock only 2.
    state.cart_items = [
      { id: "parent-1", cart_id: "cart-1", product_id: "kit", parent_cart_item_id: null, quantity: 1, variant_id: null },
      { id: "child-1", cart_id: "cart-1", product_id: "kit", parent_cart_item_id: "parent-1", variant_id: "v1", quantity: 1 },
    ];

    const err: unknown = await updateCartItemQuantity(
      client as never,
      "parent-1",
      5
    ).then(
      () => null,
      (e: unknown) => e
    );

    expect(err).toBeInstanceOf(StockExceededError);
    expect((err as StockExceededError).available).toBe(2);
    expect(state.updateCalls).toHaveLength(0);
  });

  it("allows raising a kit parent qty up to the child variant stock even though the product's own stock_quantity is NULL", async () => {
    const { client, state } = makeClient();
    state.products = [
      { id: "kit", stock_quantity: null, max_quantity: null, product_type: "kit" },
    ];
    state.product_variants = [{ id: "v1", stock_quantity: 5 }];
    state.cart_items = [
      { id: "parent-1", cart_id: "cart-1", product_id: "kit", parent_cart_item_id: null, quantity: 1, variant_id: null },
      { id: "child-1", cart_id: "cart-1", product_id: "kit", parent_cart_item_id: "parent-1", variant_id: "v1", quantity: 1 },
    ];

    await updateCartItemQuantity(client as never, "parent-1", 5);

    expect(state.updateCalls).toHaveLength(1);
    expect(state.updateCalls[0]).toEqual({
      table: "cart_items",
      id: "parent-1",
      set: { quantity: 5 },
    });
  });
});