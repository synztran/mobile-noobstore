import { describe, expect, it } from "vitest";
import { cartItemToGA, cartItemsToGA, toGAProduct } from "./analytics";

describe("toGAProduct", () => {
  it("maps base product fields with base_price", () => {
    expect(
      toGAProduct({
        id: "p1",
        name: "Keycap Set",
        category: "Add-Ons",
        brand: "NoobStore",
        base_price: 500_000,
      })
    ).toEqual({
      id: "p1",
      name: "Keycap Set",
      price: 500_000,
      brand: "NoobStore",
      category: "Add-Ons",
      quantity: undefined,
    });
  });

  it("uses variant effective_price over base_price", () => {
    expect(
      toGAProduct(
        { id: "p1", name: "Switch", base_price: 300_000 },
        { effective_price: 250_000 }
      )
    ).toMatchObject({ price: 250_000 });
  });

  it("prefers discount_price over base_price", () => {
    expect(
      toGAProduct({
        id: "p1",
        name: "Board",
        base_price: 1_000_000,
        discount_price: 850_000,
      })
    ).toMatchObject({ price: 850_000 });
  });

  it("falls back to 0 when no price source exists", () => {
    expect(toGAProduct({ id: "p1", name: "Freebie" })).toMatchObject({
      price: 0,
    });
  });
});

describe("cartItemToGA", () => {
  it("uses variant effective_price when present", () => {
    const item = {
      product: {
        id: "p1",
        name: "Keyboard",
        category: "Keyboards",
        base_price: 2_000_000,
        stock_quantity: 5,
      },
      variant: { id: "v1", effective_price: 2_500_000 },
      quantity: 2,
    } as Parameters<typeof cartItemToGA>[0];

    expect(cartItemToGA(item)).toMatchObject({
      id: "p1",
      name: "Keyboard",
      category: "Keyboards",
      price: 2_500_000,
      quantity: 2,
    });
  });

  it("sums component price adjustments onto base price", () => {
    const item = {
      product: {
        id: "p1",
        name: "Kit",
        category: "Keyboards",
        base_price: 1_000_000,
        stock_quantity: 5,
      },
      variant: null,
      components: [
        { price_adjustment: 100_000 },
        { price_adjustment: 50_000 },
      ],
      quantity: 1,
    } as Parameters<typeof cartItemToGA>[0];

    expect(cartItemToGA(item).price).toBe(1_150_000);
  });

  it("falls back to product base_price for null variant", () => {
    const item = {
      product: {
        id: "p1",
        name: "Cable",
        category: "Cables",
        base_price: 200_000,
        stock_quantity: 5,
      },
      variant: null,
      quantity: 3,
    } as Parameters<typeof cartItemToGA>[0];

    expect(cartItemToGA(item)).toMatchObject({
      price: 200_000,
      quantity: 3,
    });
  });
});

describe("cartItemsToGA", () => {
  it("maps each cart item", () => {
    const make = (id: string, name: string) =>
      ({
        product: {
          id,
          name,
          category: "Keyboards",
          base_price: 100_000,
          stock_quantity: 5,
        },
        variant: null,
        quantity: 1,
      }) as Parameters<typeof cartItemToGA>[0];

    const result = cartItemsToGA([make("a", "A"), make("b", "B")]);
    expect(result).toHaveLength(2);
    expect(result.map((p) => p.id)).toEqual(["a", "b"]);
  });
});
