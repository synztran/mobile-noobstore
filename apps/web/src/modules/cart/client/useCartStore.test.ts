import { afterEach, describe, expect, it, vi } from "vitest";
import type { CartItem } from "@/modules/cart/types";
import type {
  Product,
  ProductVariant,
  SelectedComponent,
} from "@/modules/products/types";

vi.mock("gooey-toast", () => ({
  gooeyToast: {
    success: () => {},
    error: () => {},
    info: () => {},
    warning: () => {},
  },
}));

import { useCartStore } from "./hooks/useCartStore";

// ─── Test helpers ────────────────────────────────────────────────────────────

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: "prod-1",
    name: "Test Product",
    category: "Keyboards",
    base_price: 1_000_000,
    stock_quantity: 10,
    brand: "TestBrand",
    ...overrides,
  };
}

function makeVariant(overrides: Partial<ProductVariant> = {}): ProductVariant {
  return {
    id: "var-1",
    variant_name: "Red",
    price_adjustment: 100_000,
    effective_price: 1_100_000,
    ...overrides,
  };
}

function makeComponent(
  overrides: Partial<SelectedComponent> = {}
): SelectedComponent {
  return {
    variant_id: "comp-var-1",
    variant_name: "Blue Case",
    component_group: "Case",
    price_adjustment: 50_000,
    thumbnail: null,
    ...overrides,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("useCartStore", () => {
  afterEach(() => {
    useCartStore.getState().clearCart();
  });

  // ── addItem ──────────────────────────────────────────────────────────────

  describe("addItem", () => {
    it("adds a new simple product with quantity 1", () => {
      const product = makeProduct();
      useCartStore.getState().addItem(product, null);

      const items = useCartStore.getState().items;
      expect(items).toHaveLength(1);
      expect(items[0].product.id).toBe("prod-1");
      expect(items[0].variant).toBeNull();
      expect(items[0].quantity).toBe(1);
    });

    it("increments quantity when same product+variant is added again", () => {
      const product = makeProduct();
      const variant = makeVariant();

      useCartStore.getState().addItem(product, variant);
      useCartStore.getState().addItem(product, variant);

      const items = useCartStore.getState().items;
      expect(items).toHaveLength(1);
      expect(items[0].quantity).toBe(2);
    });

    it("creates separate entries for different variants of the same product", () => {
      const product = makeProduct();
      const red = makeVariant({ id: "var-red", variant_name: "Red" });
      const blue = makeVariant({ id: "var-blue", variant_name: "Blue" });

      useCartStore.getState().addItem(product, red);
      useCartStore.getState().addItem(product, blue);

      const items = useCartStore.getState().items;
      expect(items).toHaveLength(2);
      expect(items.map((i) => i.variant?.id).sort()).toEqual([
        "var-blue",
        "var-red",
      ]);
    });

    it("creates separate entries for different kit component configs", () => {
      const product = makeProduct();
      const compA = makeComponent({
        variant_id: "cv-1",
        component_group: "Case",
      });
      const compB = makeComponent({
        variant_id: "cv-2",
        component_group: "Case",
      });

      useCartStore.getState().addItem(product, null, [compA]);
      useCartStore.getState().addItem(product, null, [compB]);

      const items = useCartStore.getState().items;
      expect(items).toHaveLength(2);
    });

    it("increments quantity for identical kit component config", () => {
      const product = makeProduct();
      const comp = makeComponent();

      useCartStore.getState().addItem(product, null, [comp]);
      useCartStore.getState().addItem(product, null, [comp]);

      const items = useCartStore.getState().items;
      expect(items).toHaveLength(1);
      expect(items[0].quantity).toBe(2);
    });

    it("marks kit as pre_order when any component is pre_order", () => {
      const product = makeProduct({ is_pre_order: undefined });
      const comp = makeComponent({ is_pre_order: true });

      useCartStore.getState().addItem(product, null, [comp]);

      const items = useCartStore.getState().items;
      expect(items[0].is_pre_order).toBe(true);
    });

    it("stores gifts on the cart item", () => {
      const product = makeProduct();
      const gifts = [
        {
          gift_name: "Free Cable",
          gift_slug: "free-cable",
          gift_thumbnail: null,
          quantity: 1,
        },
      ];

      useCartStore.getState().addItem(product, null, undefined, gifts);

      const items = useCartStore.getState().items;
      expect(items[0].gifts).toEqual(gifts);
    });
  });

  // ── addStandardProduct ───────────────────────────────────────────────────

  describe("addStandardProduct", () => {
    it("adds a product when stock is available", () => {
      const product = makeProduct({ stock_quantity: 5 });
      const result = useCartStore.getState().addStandardProduct(product, null);

      expect(result.success).toBe(true);
      expect(useCartStore.getState().items).toHaveLength(1);
    });

    it("rejects when stock would be exceeded", () => {
      const product = makeProduct({ stock_quantity: 2 });
      const store = useCartStore.getState();

      store.addStandardProduct(product, null); // qty 1
      store.addStandardProduct(product, null); // qty 2
      const result = store.addStandardProduct(product, null); // qty 3 — exceeds

      expect(result.success).toBe(false);
      expect(result.reason).toContain("2");
    });

    it("allows adding pre_order products regardless of stock", () => {
      const product = makeProduct({ is_pre_order: true, stock_quantity: 0 });
      const store = useCartStore.getState();

      const result = store.addStandardProduct(product, null);

      expect(result.success).toBe(true);
    });
  });

  // ── removeItem ───────────────────────────────────────────────────────────

  describe("removeItem", () => {
    it("removes the matching item", () => {
      const product = makeProduct();
      useCartStore.getState().addItem(product, null);
      expect(useCartStore.getState().items).toHaveLength(1);

      useCartStore.getState().removeItem("prod-1", null);
      expect(useCartStore.getState().items).toHaveLength(0);
    });

    it("does not remove items with different variant IDs", () => {
      const product = makeProduct();
      const variant = makeVariant();
      useCartStore.getState().addItem(product, variant);

      useCartStore.getState().removeItem("prod-1", "wrong-variant");
      expect(useCartStore.getState().items).toHaveLength(1);
    });
  });

  // ── updateQty ────────────────────────────────────────────────────────────

  describe("updateQty", () => {
    it("increments quantity by delta", () => {
      const product = makeProduct({ stock_quantity: 10 });
      useCartStore.getState().addItem(product, null);

      useCartStore.getState().updateQty("prod-1", null, 1);

      expect(useCartStore.getState().items[0].quantity).toBe(2);
    });

    it("decrements quantity by delta", () => {
      const product = makeProduct();
      useCartStore.getState().addItem(product, null);
      useCartStore.getState().addItem(product, null);
      useCartStore.getState().updateQty("prod-1", null, -1);

      expect(useCartStore.getState().items[0].quantity).toBe(1);
    });

    it("removes item when quantity drops to 0", () => {
      const product = makeProduct();
      useCartStore.getState().addItem(product, null);
      useCartStore.getState().updateQty("prod-1", null, -1);

      expect(useCartStore.getState().items).toHaveLength(0);
    });

    it("caps quantity at stock_quantity for non-pre-order", () => {
      const product = makeProduct({ stock_quantity: 3 });
      useCartStore.getState().addItem(product, null);

      useCartStore.getState().updateQty("prod-1", null, 10);

      expect(useCartStore.getState().items[0].quantity).toBe(3);
    });

    it("allows unlimited quantity for pre-order items", () => {
      const product = makeProduct({ stock_quantity: 0, is_pre_order: true });
      useCartStore.getState().addItem(product, null);

      useCartStore.getState().updateQty("prod-1", null, 50);

      expect(useCartStore.getState().items[0].quantity).toBe(51);
    });
  });

  // ── computed totals ──────────────────────────────────────────────────────

  describe("total", () => {
    it("calculates total for simple product", () => {
      const product = makeProduct({ base_price: 500_000 });
      useCartStore.getState().addItem(product, null);

      expect(useCartStore.getState().total()).toBe(500_000);
    });

    it("calculates total with variant effective_price", () => {
      const product = makeProduct({ base_price: 500_000 });
      const variant = makeVariant({ effective_price: 700_000 });
      useCartStore.getState().addItem(product, variant);

      expect(useCartStore.getState().total()).toBe(700_000);
    });

    it("calculates total with component price_adjustments", () => {
      const product = makeProduct({ base_price: 500_000 });
      const comp = makeComponent({ price_adjustment: 100_000 });
      useCartStore.getState().addItem(product, null, [comp]);

      expect(useCartStore.getState().total()).toBe(600_000);
    });

    it("scales total by quantity", () => {
      const product = makeProduct({ base_price: 500_000 });
      useCartStore.getState().addItem(product, null);
      useCartStore.getState().addItem(product, null);

      expect(useCartStore.getState().total()).toBe(1_000_000);
    });
  });

  describe("subtotal", () => {
    it("matches total() — includes the variant", () => {
      const product = makeProduct({ base_price: 500_000 });
      const variant = makeVariant({ effective_price: 700_000 });
      useCartStore.getState().addItem(product, variant);

      expect(useCartStore.getState().subtotal()).toBe(700_000);
      expect(useCartStore.getState().subtotal()).toBe(
        useCartStore.getState().total()
      );
    });
  });

  describe("kit variant identity", () => {
    it("keeps Purple+70sw and Trash+70sw as separate lines", () => {
      const product = makeProduct({ base_price: 650_000 });
      const comp = makeComponent({ price_adjustment: 150_000 });
      const purple = makeVariant({ id: "purple", effective_price: 650_000 });
      const trash = makeVariant({ id: "trash", effective_price: 700_000 });

      useCartStore.getState().addItem(product, purple, [comp]);
      useCartStore.getState().addItem(product, trash, [comp]);

      expect(useCartStore.getState().items).toHaveLength(2);
    });

    it("merges two identical kit configurations", () => {
      const product = makeProduct({ base_price: 650_000 });
      const comp = makeComponent({ price_adjustment: 150_000 });
      const purple = makeVariant({ id: "purple", effective_price: 650_000 });

      useCartStore.getState().addItem(product, purple, [comp]);
      useCartStore.getState().addItem(product, purple, [comp]);

      expect(useCartStore.getState().items).toHaveLength(1);
      expect(useCartStore.getState().items[0].quantity).toBe(2);
    });
  });

  describe("itemCount", () => {
    it("sums all item quantities", () => {
      const product = makeProduct({ stock_quantity: 10 });
      useCartStore.getState().addItem(product, null);
      useCartStore.getState().addItem(product, null);
      useCartStore.getState().addItem(product, null);

      expect(useCartStore.getState().itemCount()).toBe(3);
    });
  });

  // ── clearCart ────────────────────────────────────────────────────────────

  describe("clearCart", () => {
    it("removes all items and cartId", () => {
      const product = makeProduct();
      useCartStore.getState().addItem(product, null);
      useCartStore.getState().clearCart();

      expect(useCartStore.getState().items).toHaveLength(0);
      expect(useCartStore.getState().cartId).toBeNull();
    });
  });

  // ── openCart / closeCart ─────────────────────────────────────────────────

  describe("cart drawer", () => {
    it("toggles open/close", () => {
      expect(useCartStore.getState().isOpen).toBe(false);
      useCartStore.getState().openCart();
      expect(useCartStore.getState().isOpen).toBe(true);
      useCartStore.getState().closeCart();
      expect(useCartStore.getState().isOpen).toBe(false);
    });
  });
});
