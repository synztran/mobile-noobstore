import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Unit tests for restoreOrderStock (web copy).
 *
 * Covers the Option B hardening: a kit component variant's stock must be
 * restored as parent_item.quantity × order_item_components.quantity — so an
 * order with quantity 2 and ONE component row (quantity 1) restores 2 units.
 */

const updateCalls: Array<{
  table: string;
  payload: Record<string, unknown>;
  id: string;
}> = [];

type Row = Record<string, unknown>;

function thenableValue<T>(value: T) {
  return {
    then: (resolve: (v: T) => unknown) => resolve(value),
  };
}

/**
 * Fake Supabase client.
 *  - `results[table]` is returned (as {data, error}) when any query builder on
 *    that table is awaited.
 *  - `.update(payload)` records { table, payload, id } and resolves with no error.
 */
function makeClient(results: Record<string, Row[]>) {
  return {
    from: (table: string) => {
      const query: Record<string, (...a: unknown[]) => unknown> = {};
      query.select = () => query;
      query.eq = () => query;
      query.in = () => query;
      query.not = () => query;
      query.order = () => query;
      query.limit = () => query;
      query.neq = () => query;
      query.single = () =>
        thenableValue({ data: results[table]?.[0] ?? null, error: null });
      query.maybeSingle = () =>
        thenableValue({ data: results[table]?.[0] ?? null, error: null });
      query.update = (payload: Row) => ({
        eq: (_col: string, id: string) => {
          updateCalls.push({ table, payload, id: String(id) });
          return {
            then: (cb: (r: { data: null; error: null }) => unknown) =>
              cb({ data: null, error: null }),
          };
        },
      });
      // Make the query builder awaitable: await ... resolves to {data, error}
      const awaited = {
        then: (resolve: (r: { data: Row[]; error: null }) => unknown) =>
          resolve({ data: results[table] ?? [], error: null }),
      };
      return Object.assign(query, awaited);
    },
  };
}

import { restoreOrderStock } from "@/lib/services/orderService";
import * as adminModule from "@/lib/supabase/admin";

vi.mock("@/lib/supabase/admin", () => ({
  getAdminClient: () => {
    throw new Error("getAdminClient stub");
  },
}));

let currentAdmin: typeof adminModule.getAdminClient;
beforeEach(() => {
  updateCalls.length = 0;
  currentAdmin = vi
    .spyOn(adminModule, "getAdminClient")
    .mockImplementation(() => {
      throw new Error("client not configured for this test");
    });
});

function runWith(client: ReturnType<typeof makeClient>) {
  currentAdmin.mockImplementation(() => client);
}

describe("restoreOrderStock", () => {
  it("restores a kit component variant by parent quantity × component quantity", async () => {
    const client = makeClient({
      orders: [{ status: "delivering" }],
      order_item_components: [
        {
          product_variant_id: "variant-1",
          order_item_id: "item-1",
          quantity: 1,
        },
      ],
      // Both section-2's simple-product query and the parent lookup return this.
      // It has product_id = a kit, so section 2 treats it as a kit and skips
      // restoring the parent product; the parent lookup reads quantity = 2.
      order_items: [{ id: "item-1", product_id: "kit-product", quantity: 2 }],
      product_components: [{ parent_product_id: "kit-product" }],
      product_variants: [{ id: "variant-1", stock_quantity: 3 }],
    });
    runWith(client);

    await restoreOrderStock("order-1");

    // 3 (current) + 2 (parent qty) × 1 (component qty) = 5
    expect(updateCalls).toContainEqual({
      table: "product_variants",
      payload: { stock_quantity: 5 },
      id: "variant-1",
    });
    // The parent product (a kit) must NOT be updated as a simple product.
    expect(
      updateCalls.filter((u) => u.table === "products").length
    ).toBe(0);
  });

  it("scales restore by component quantity > 1", async () => {
    const client = makeClient({
      orders: [{ status: "delivering" }],
      order_item_components: [
        {
          product_variant_id: "variant-1",
          order_item_id: "item-1",
          quantity: 3,
        },
      ],
      order_items: [{ id: "item-1", product_id: "kit-product", quantity: 2 }],
      product_components: [{ parent_product_id: "kit-product" }],
      product_variants: [{ id: "variant-1", stock_quantity: 10 }],
    });
    runWith(client);

    await restoreOrderStock("order-1");

    // 10 + 2 × 3 = 16
    expect(updateCalls).toContainEqual({
      table: "product_variants",
      payload: { stock_quantity: 16 },
      id: "variant-1",
    });
  });

  it("does nothing when order status is already cancelled (bypass)", async () => {
    const client = makeClient({
      orders: [{ status: "cancelled" }],
      order_item_components: [{ product_variant_id: "v", quantity: 1 }],
      order_items: [],
      product_components: [],
      product_variants: [{ id: "v", stock_quantity: 5 }],
    });
    runWith(client);

    await restoreOrderStock("order-1");

    expect(updateCalls).toHaveLength(0);
  });

  it("restores simple (non-kit) products by quantity", async () => {
    const client = makeClient({
      orders: [{ status: "delivering" }],
      order_item_components: [],
      order_items: [{ product_id: "prod-1", quantity: 2 }],
      product_components: [],
      products: [{ id: "prod-1", stock_quantity: 4 }],
    });
    runWith(client);

    await restoreOrderStock("order-1");

    // 4 + 2 = 6
    expect(updateCalls).toContainEqual({
      table: "products",
      payload: { stock_quantity: 6 },
      id: "prod-1",
    });
  });
});
