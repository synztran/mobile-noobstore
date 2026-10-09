import { ShopProduct } from "@/modules/products/types";
import { formatVND } from "@/lib/currency";
import { memo } from "react";
import { cardPricingFor } from "./card-pricing";

const ProductCardPricing = memo(({ product }: { product: ShopProduct }) => {
  const { amount, showFrom, showDiscount, unpriced } = cardPricingFor(product);

  if (showDiscount) {
    return (
      <div>
        <div className="text-right text-xs font-bold text-on-surface-variant line-through lg:text-sm">
          {formatVND(product.base_price)}
        </div>
        <div className="text-right text-base font-extrabold text-red-600 lg:text-lg">
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
      <div className="text-right text-xs font-extrabold text-slate-500 lg:text-sm">
        giá đang cập nhật
      </div>
    );
  }

  return (
    <div className="space-x-1 text-right text-sm font-extrabold text-primary lg:text-base">
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
