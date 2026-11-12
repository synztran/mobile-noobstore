"use client";

import Image from "next/image";
import { formatVND } from "@/lib/currency";
import type { PreOrderConfig, ShopProduct, ShopVariant } from "@/modules/products/types";
import { PreOrderBanner } from "@/modules/products/ui/product/PreOrderBanner";

export function DesktopProductHeader({ product, selectedVariant, preorderConfig, showThumbnail = true }: { product: ShopProduct; selectedVariant: ShopVariant | null | undefined; preorderConfig: PreOrderConfig | null | undefined; showThumbnail?: boolean }) {
  const price = product.from_price ?? product.min_price ?? product.base_price;
  const stock = product.product_type === "kit" ? product.stock_quantity : selectedVariant?.stock_quantity ?? product.stock_quantity;
  return <header className="flex shrink-0 items-center gap-[13px] border-b border-[#eee5df] bg-white px-5 py-[14px]">
    {showThumbnail && <div className="relative grid h-[62px] w-[62px] shrink-0 place-items-center overflow-hidden rounded-xl bg-[#eee9e1]">{product.thumbnail ? <Image src={product.thumbnail} alt={product.name} fill sizes="62px" className="object-cover"/> : <span aria-hidden="true">⌨</span>}</div>}
    <div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><p className="text-xs font-black uppercase tracking-[0.14em] text-[#9b3f1c]">{product.brand ?? ""}{product.brand ? " · " : ""}{product.category}</p><p className="shrink-0 text-xs font-semibold text-[#76675f]">{stock > 0 ? `Còn hàng · ${stock}` : product.is_pre_order ? "Đặt trước" : "Hết hàng"}</p></div>
      <h3 className="my-1 line-clamp-2 text-lg font-black leading-[1.2] text-[#211916]">{product.name}</h3>
      <p className="text-base font-black text-[#9b3f1c]">{product.product_type === "kit" && product.from_price != null && <span className="mr-1 text-xs">Giá từ</span>}{formatVND(price)}</p>
      {product.is_pre_order && preorderConfig && <div className="mt-2 max-w-[540px]"><PreOrderBanner config={preorderConfig}/></div>}
    </div>
  </header>;
}
