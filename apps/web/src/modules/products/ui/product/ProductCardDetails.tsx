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
  const cleanDescription = product.description
    ? product.description.replace(/<[^>]*>/g, "").trim()
    : "";

  return (
    <div className="relative flex flex-col gap-0.5">
      <div className="flex min-w-0 flex-col gap-0.5 lg:flex-row lg:items-center lg:justify-between lg:gap-3">
        {product.brand && (
          <p className="min-w-0 truncate text-[11px] font-bold uppercase tracking-wider text-primary">
            {product.brand}
          </p>
        )}
        {product.sold_count > 0 && (
          <p className="shrink-0 text-[10px] font-semibold text-amber-600">
            Đã bán {product.sold_count}
          </p>
        )}
      </div>
      <h3 className="line-clamp-2 text-xs font-bold leading-snug text-on-surface lg:line-clamp-1 lg:text-sm">
        {product.name}
      </h3>
      {!isBundle && cleanDescription && (
        <p className="line-clamp-3 text-[10px] text-on-surface-variant/70 lg:text-xs">
          {cleanDescription}
        </p>
      )}
    </div>
  );
});
