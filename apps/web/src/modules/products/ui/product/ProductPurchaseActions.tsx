"use client";

import type { ProductDetail, ShopVariant } from "@/modules/products/types";
import { AddToCartButton } from "@/modules/products/ui/product/AddToCartButton";
import { StockAlertButton } from "@/modules/products/ui/product/StockAlertButton";
import WishlistButton from "@/modules/user/ui/wishlist/WishlistButton";
import { motion } from "framer-motion";

interface ProductPurchaseActionsProps {
  product: ProductDetail;
  selectedVariant: ShopVariant | null;
  isOutOfStock: boolean;
  missingVariantSelection: boolean;
  missingConfiguration: boolean;
  isLoadingAddToCart: boolean;
  isPreOrder: boolean;
  onAddToCart: () => void;
}

export function ProductPurchaseActions({
  product,
  selectedVariant,
  isOutOfStock,
  missingVariantSelection,
  missingConfiguration,
  isLoadingAddToCart,
  isPreOrder,
  onAddToCart,
}: ProductPurchaseActionsProps) {
  return (
    <motion.div
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 30,
        mass: 0.8,
      }}
      className="fixed bottom-0 left-0 right-0 z-[100] flex items-center gap-2 rounded-t-2xl border-t border-outline-variant/20 bg-surface/95 px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3 shadow-float backdrop-blur-md lg:static lg:z-auto lg:w-full lg:rounded-2xl lg:border lg:bg-surface lg:p-3 lg:shadow-ambient-sm lg:backdrop-blur-none"
    >
      <WishlistButton
        productId={product.id}
        product={product}
        showLabel
        size="md"
        className="flex shrink-0 items-center gap-2 rounded-2xl border border-outline-variant/30 px-4"
        iconOnly={false}
      />
      {isOutOfStock ? (
        <StockAlertButton
          productId={product.id}
          variantId={selectedVariant?.id ?? ""}
        />
      ) : (
        <AddToCartButton
          isOutOfStock={isOutOfStock}
          missingVariantSelection={missingVariantSelection}
          missingConfiguration={missingConfiguration}
          isLoading={isLoadingAddToCart}
          isPreOrder={isPreOrder}
          onClick={onAddToCart}
        />
      )}
    </motion.div>
  );
}
