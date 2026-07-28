"use client";

import type { ShopProduct } from "@/app/api/products/route";
import { formatVND } from "@/lib/currency";

interface ProductCardDetailsProps {
  product: ShopProduct;
  isBundle?: boolean;
}

function Pricing({ product }: { product: ShopProduct }) {
  if (product.discount_price && product.discount_price > 0) {
    return (
      <div>
        <div className="text-right text-base font-extrabold text-red-600">
          {formatVND(product.discount_price)}
        </div>
        <div className="text-right text-xs font-bold text-on-surface-variant line-through">
          {formatVND(product.base_price)}
        </div>
      </div>
    );
  }

  if (!product.base_price && !product.min_price) {
    return (
      <div className="text-right text-xs font-extrabold text-slate-500">
        giá đang cập nhật
      </div>
    );
  }

  return (
    <div className="text-right text-base font-extrabold text-primary">
      {product.base_price === 0 && (
        <span className="text-xs text-slate-500">giá chỉ từ</span>
      )}
      &nbsp;
      {formatVND(product.base_price || product.min_price)}
    </div>
  );
}

export function ProductCardDetails({
  product,
  isBundle = false,
}: ProductCardDetailsProps) {
  return (
    <div className="relative">
      <p className="truncate text-[11px] font-extrabold capitalize tracking-[0.1em] text-primary">
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
      <Pricing product={product} />
    </div>
  );
}
