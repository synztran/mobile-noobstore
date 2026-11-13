import { describe, expect, it } from "vitest";
import { sortConfiguratorVariants } from "./configurator-order";

describe("sortConfiguratorVariants", () => {
  it("orders in-stock, then pre-order, then sold-out variants stably", () => {
    const variants = [
      { id: "sold-out", stock_quantity: 0, is_pre_order: false },
      { id: "preorder-stock", stock_quantity: 5, is_pre_order: true },
      { id: "available-2", stock_quantity: 2, is_pre_order: false },
      { id: "preorder-zero", stock_quantity: 0, is_pre_order: true },
      { id: "available-1", stock_quantity: 1, is_pre_order: false },
    ] as Parameters<typeof sortConfiguratorVariants>[0];

    expect(
      sortConfiguratorVariants(variants).map((variant) => variant.id)
    ).toEqual([
      "available-2",
      "available-1",
      "preorder-stock",
      "preorder-zero",
      "sold-out",
    ]);
  });
});
