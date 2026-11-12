import { ShopProduct } from "@/modules/products/types";
import { formatVND } from "@/lib/currency";
import { memo } from "react";
import { cardPricingFor } from "./card-pricing";

interface ProductCardPricingProps {
  product: ShopProduct;
  align?: "left" | "right";
}

const ProductCardPricing = memo(({ product, align = "right" }: ProductCardPricingProps) => {
  const { amount, showFrom, showDiscount, unpriced } = cardPricingFor(product);
  const alignClass = align === "right" ? "text-right" : "text-left";

  if (showDiscount) {
    return (
      <div className={alignClass}>
        <div className={`text-xs font-bold text-on-surface-variant line-through lg:text-sm ${alignClass}`}>
          {formatVND(product.base_price)}
        </div>
        <div className={`text-base font-extrabold text-red-600 lg:text-lg ${alignClass}`}>
          {showFrom && (
            <span className="mr-1 break-all text-xs text-red-600/80 lg:text-sm">
              giá chỉ từ
            </span>
          )}
          {formatVND(product.discount_price ?? 0)}
        </div>
      </div>
    );
  }

  if (unpriced) {
    return (
      <div className={`text-xs font-extrabold text-slate-500 lg:text-sm ${alignClass}`}>
        giá đang cập nhật
      </div>
    );
  }

  return (
    <div className={`space-x-1 text-sm font-extrabold text-primary lg:text-base ${alignClass}`}>
      {showFrom && (
        <span className="break-all text-xs text-slate-500 lg:text-sm">
          giá chỉ từ
        </span>
      )}
      <span className="whitespace-nowrap text-base lg:text-lg">
        {formatVND(amount)}
      </span>
    </div>
  );
});

export default memo(ProductCardPricing);
