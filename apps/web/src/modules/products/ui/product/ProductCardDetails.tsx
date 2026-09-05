"use client";

import type { ShopProduct } from "@/modules/products/types";
import { formatVND } from "@/lib/currency";
import { memo } from "react";

interface ProductCardDetailsProps {
  product: ShopProduct;
  isBundle?: boolean;
}

export const ProductCardDetails = memo(function ProductCardDetails({
  product,
  isBundle = false,
}: ProductCardDetailsProps) {
  return (
    <div className="relative">
      <p className="truncate text-xs font-extrabold capitalize tracking-[0.05em] text-primary">
        {product.brand || product.category}
      </p>
      <h3 className="line-clamp-2 text-sm font-bold capitalize text-on-surface">
        {product.name}
      </h3>
      {!isBundle && (
        <p className="line-clamp-3 text-[10px]">
          {product.description?.replace(/<[^>]*>/g, "") || ""}
        </p>
      )}
      {product.sold_count > 0 && (
        <p className="text-[9px] font-bold text-amber-600">
          Đã bán {product.sold_count}
        </p>
      )}
      {/* <Pricing product={product} /> */}
    </div>
  );
});
