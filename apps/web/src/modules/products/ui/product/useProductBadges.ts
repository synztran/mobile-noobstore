import type { ProductDetail, ShopVariant } from "@/modules/products/types";
import type { ProductBadge } from "./ProductBadges";

export type ResolveProductBadgesStateOptions = {
  product: Pick<
    ProductDetail,
    "base_price" | "min_price" | "is_used" | "is_pre_order" | "product_type"
  >;
  variants: ShopVariant[];
  selectedVariant: ShopVariant | null;
  isOutOfStock: boolean;
};

export type ProductBadgesInput = {
  isOutOfStock: boolean;
  isUsed: boolean;
  isPreOrder: boolean;
  discountPercent: number;
  variantCount: number;
  isKit: boolean;
};

/**
 * Turns product + current variant selection into badge state.
 * Variant-aware: pre-order and discount follow the selected variant when one
 * is chosen (a product can carry mixed in-stock / pre-order variants).
 */
export function resolveProductBadgesState(
  opts: ResolveProductBadgesStateOptions
): ProductBadgesInput {
  const { product, variants, selectedVariant, isOutOfStock } = opts;

  const basePrice = product.base_price;
  const referencePrice = selectedVariant
    ? selectedVariant.effective_price
    : product.min_price;
  const discountPercent =
    referencePrice < basePrice
      ? Math.round(((basePrice - referencePrice) / basePrice) * 100)
      : 0;

  return {
    isOutOfStock,
    isUsed: product.is_used,
    isPreOrder: selectedVariant
      ? selectedVariant.is_pre_order
      : product.is_pre_order,
    discountPercent,
    variantCount: variants.length,
    isKit: product.product_type === "kit",
  };
}

export function computeProductBadges(
  input: ProductBadgesInput
): ProductBadge[] {
  const list: ProductBadge[] = [];

  if (input.isOutOfStock) {
    list.push({
      key: "out-of-stock",
      label: "Hết hàng",
      className: "bg-surface-container-high text-on-surface-variant",
    });
  }

  if (input.isUsed) {
    list.push({
      key: "used",
      label: "Đã qua sử dụng",
      className: "bg-yellow-600 text-white",
    });
  }

  if (input.isPreOrder) {
    list.push({
      key: "pre-order",
      label: "Đặt trước",
      className: "bg-violet-500 text-white",
    });
  }

  if (input.discountPercent > 0) {
    list.push({
      key: "discount",
      label: `-${input.discountPercent}%`,
      className: "bg-red-500 text-white",
    });
  }

  if (list.length === 0) {
    list.push({
      key: "fallback",
      label: input.isKit
        ? "Combo tùy chỉnh"
        : input.variantCount > 0
          ? `${input.variantCount} tùy chọn`
          : "Sẵn sàng để giao",
      className: "bg-primary text-white",
    });
  }

  return list;
}

export function useProductBadges(opts: {
  product: ResolveProductBadgesStateOptions["product"];
  variants: ShopVariant[];
  selectedVariant: ShopVariant | null;
  isOutOfStock: boolean;
}): ProductBadge[] {
  return computeProductBadges(resolveProductBadgesState(opts));
}