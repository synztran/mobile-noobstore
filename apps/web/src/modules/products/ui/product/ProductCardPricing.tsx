import { ShopProduct } from "@/modules/products/types";
import { formatVND } from "@/lib/currency";
import { memo } from "react";

const ProductCardPricing = memo(({ product }: { product: ShopProduct }) => {
  const fromPrice = product.from_price ?? product.min_price;

  if (product.discount_price && product.discount_price > 0) {
    return (
      <div>
        <div className="text-right text-xs font-bold text-on-surface-variant line-through lg:text-sm">
          {formatVND(product.base_price)}
        </div>
        <div className="text-right text-base font-extrabold text-red-600 lg:text-lg">
          {formatVND(product.discount_price)}
        </div>
      </div>
    );
  }

  if (!product.base_price && !fromPrice) {
    return (
      <div className="text-right text-xs font-extrabold text-slate-500 lg:text-sm">
        giá đang cập nhật
      </div>
    );
  }

  return (
    <div className="space-x-1 text-right text-sm font-extrabold text-primary lg:text-base">
      {product.base_price === 0 && (
        <span className="break-all text-xs text-slate-500 lg:text-sm">
          giá chỉ từ
        </span>
      )}
      <span className="whitespace-nowrap text-base lg:text-lg">
        {formatVND(product.base_price || fromPrice)}
      </span>
    </div>
  );
});

export default memo(ProductCardPricing);
