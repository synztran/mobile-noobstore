import { describe, expect, it } from "vitest";
import type { ShopVariant } from "@/modules/products/types";
import {
  computeProductBadges,
  resolveProductBadgesState,
  type ResolveProductBadgesStateOptions,
} from "./useProductBadges";

function makeProduct(
  overrides: Partial<ResolveProductBadgesStateOptions["product"]> = {}
): ResolveProductBadgesStateOptions["product"] {
  return {
    base_price: 1_000_000,
    min_price: 900_000,
    is_used: false,
    is_pre_order: false,
    product_type: "standard",
    ...overrides,
  };
}

function makeVariant(
  overrides: Partial<ShopVariant> = {}
): ShopVariant {
  return {
    id: "v1",
    variant_name: "Variant A",
    price_adjustment: 0,
    effective_price: 900_000,
    thumbnail: null,
    stock_quantity: 10,
    is_pre_order: false,
    pre_order_config: null,
    attributes: null,
    ...overrides,
  };
}

function resolve(opts: Partial<ResolveProductBadgesStateOptions> = {}) {
  const product = opts.product ?? makeProduct();
  const variants = opts.variants ?? [makeVariant()];
  return resolveProductBadgesState({
    product,
    variants,
    selectedVariant: opts.selectedVariant ?? null,
    isOutOfStock: opts.isOutOfStock ?? false,
  });
}

describe("computeProductBadges (display states)", () => {
  it("out of stock sorts first, before other states", () => {
    const badges = computeProductBadges({
      isOutOfStock: true,
      isUsed: true,
      isPreOrder: true,
      discountPercent: 25,
      variantCount: 3,
      isKit: false,
    });
    expect(badges[0]).toEqual(
      expect.objectContaining({ key: "out-of-stock", label: "Hết hàng" })
    );
  });

  it("orders used → pre-order → discount", () => {
    const badges = computeProductBadges({
      isOutOfStock: false,
      isUsed: true,
      isPreOrder: true,
      discountPercent: 25,
      variantCount: 3,
      isKit: false,
    });
    expect(badges.map((b) => b.key)).toEqual(["used", "pre-order", "discount"]);
    expect(badges[2].label).toBe("-25%");
  });

  it("skips discount badge at 0%", () => {
    const badges = computeProductBadges({
      isOutOfStock: false,
      isUsed: false,
      isPreOrder: false,
      discountPercent: 0,
      variantCount: 2,
      isKit: false,
    });
    expect(badges.map((b) => b.key)).not.toContain("discount");
  });

  it("fallback counts options for simple products with variants", () => {
    const badges = computeProductBadges({
      isOutOfStock: false,
      isUsed: false,
      isPreOrder: false,
      discountPercent: 0,
      variantCount: 3,
      isKit: false,
    });
    expect(badges).toEqual([
      expect.objectContaining({ label: "3 tùy chọn", className: "bg-primary text-white" }),
    ]);
  });

  it("fallback labels kits as Combo tùy chỉnh", () => {
    const badges = computeProductBadges({
      isOutOfStock: false,
      isUsed: false,
      isPreOrder: false,
      discountPercent: 0,
      variantCount: 12,
      isKit: true,
    });
    expect(badges[0].label).toBe("Combo tùy chỉnh");
  });

  it("fallback shows Sẵn sàng để giao for products without variants", () => {
    const badges = computeProductBadges({
      isOutOfStock: false,
      isUsed: false,
      isPreOrder: false,
      discountPercent: 0,
      variantCount: 0,
      isKit: false,
    });
    expect(badges[0].label).toBe("Sẵn sàng để giao");
  });
});

describe("resolveProductBadgesState (variant-aware)", () => {
  it("pre-order follows the selected variant, not the product", () => {
    const product = makeProduct({ is_pre_order: true });
    const inStockVariant = makeVariant({ is_pre_order: false });
    const state = resolve({ product, selectedVariant: inStockVariant });
    expect(state.isPreOrder).toBe(false);

    const preOrderVariant = makeVariant({ is_pre_order: true });
    expect(resolve({ product, selectedVariant: preOrderVariant }).isPreOrder).toBe(true);
  });

  it("falls back to product pre-order when no variant is selected", () => {
    const state = resolve({ product: makeProduct({ is_pre_order: true }), selectedVariant: null });
    expect(state.isPreOrder).toBe(true);
  });

  it("discount percent follows the selected variant effective price", () => {
    const product = makeProduct({ base_price: 1_000_000, min_price: 950_000 });
    const cheaper = makeVariant({ effective_price: 800_000 });
    const state = resolve({ product, selectedVariant: cheaper });
    expect(state.discountPercent).toBe(20);

    const atBase = makeVariant({ effective_price: 1_000_000 });
    expect(resolve({ product, selectedVariant: atBase }).discountPercent).toBe(0);
  });

  it("discount falls back to product min_price when nothing is selected", () => {
    const state = resolve({ product: makeProduct({ base_price: 1_000_000, min_price: 800_000 }) });
    expect(state.discountPercent).toBe(20);
  });
});