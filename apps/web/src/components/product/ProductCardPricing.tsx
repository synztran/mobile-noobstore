import { ShopProduct } from "@/app/api/products/route";
import { formatVND } from "@/lib/currency";
import { memo } from "react";

const ProductCardPricing = memo(({
  product,
}: {
  product: ShopProduct;
}) => {
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
})

export default memo(ProductCardPricing);
