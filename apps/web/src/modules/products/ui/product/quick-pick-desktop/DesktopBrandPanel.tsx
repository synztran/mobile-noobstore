"use client";

import Image from "next/image";
import { LoaderCircle, Package } from "lucide-react";
import { formatVND } from "@/lib/currency";
import type { ShopProduct } from "@/modules/products/types";

type Props = {
  activeProduct: ShopProduct | null;
  alternatives: ShopProduct[];
  loading: boolean;
  loadingGallery: boolean;
  showBrandAlternatives?: boolean;
  onSelect: (id: string) => void;
  onShowImage: (image: string) => void;
};

export function DesktopBrandPanel({ activeProduct, alternatives, loading, loadingGallery, showBrandAlternatives = true, onSelect, onShowImage }: Props) {
  const galleryByUrl = new Map<string, string | null>();
  for (const url of activeProduct?.images ?? []) {
    if (url) galleryByUrl.set(url, null);
  }
  for (const variant of activeProduct?.variants ?? []) {
    if (variant.thumbnail && !galleryByUrl.has(variant.thumbnail)) {
      galleryByUrl.set(variant.thumbnail, variant.variant_name || null);
    }
  }
  for (const variant of activeProduct?.variants ?? []) {
    if (variant.thumbnail && variant.variant_name && !galleryByUrl.get(variant.thumbnail)) {
      galleryByUrl.set(variant.thumbnail, variant.variant_name);
    }
  }
  const gallery = Array.from(galleryByUrl.entries());
  if (gallery.length === 0 && activeProduct?.thumbnail) gallery.push([activeProduct.thumbnail, null]);
  const hasAlternatives = showBrandAlternatives && alternatives.length > 0;
  const list = activeProduct ? [activeProduct, ...alternatives] : [];

  return <aside className="flex min-h-0 flex-col overflow-hidden border-r border-[#eee5df] bg-[#faf8f5]">
    <div className="shrink-0 px-3 pb-2 pt-[14px]">
      <div className="flex items-center justify-between gap-2"><h3 className="text-sm font-black text-[#211916]">{showBrandAlternatives && (loading || hasAlternatives) ? "Cùng thương hiệu" : "Ảnh sản phẩm"}</h3>{!loading && !hasAlternatives && <span className="shrink-0 text-xs font-bold tabular-nums text-[#76675f]">{gallery.length} ảnh</span>}</div>
      {activeProduct && (loading || hasAlternatives) && <p className="mt-[3px] text-[9px] font-extrabold uppercase tracking-[0.1em] text-[#9b3f1c]">{activeProduct.brand?.toUpperCase()} · {alternatives.length + 1} SẢN PHẨM</p>}
    </div>
    <div data-allow-scroll className="min-h-0 flex-1 overflow-y-auto overscroll-contain border-t border-[#eae1db] px-3">
      {!activeProduct || (showBrandAlternatives && loading) || loadingGallery ? (
        <div className="grid min-h-32 place-items-center" role="status" aria-label="Đang tải danh sách ảnh"><LoaderCircle className="h-6 w-6 animate-spin text-[#9b3f1c]" aria-hidden="true"/></div>
      ) : hasAlternatives ? (
        list.map((product) => {
          const selected = product.id === activeProduct.id;
          const price = product.from_price ?? product.min_price ?? product.base_price;
          return <button key={product.id} type="button" aria-pressed={selected} onClick={() => !selected && onSelect(product.id)} className={`w-full border-b border-[#eae1db] px-[7px] py-[10px] text-left text-[10px] font-extrabold focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[#9b3f1c] ${selected ? "bg-[#fff1ea] text-[#211916] shadow-[inset_2px_0_#a64c2b]" : "text-[#211916] hover:bg-white"}`}>
            <span className="flex items-center justify-between gap-1"><span className="line-clamp-2">{product.name}</span>{selected ? <span className="shrink-0 text-[8px] font-black text-[#9b3f1c]">ĐANG CHỌN</span> : <span className="shrink-0 text-sm text-[#9b8b83]">›</span>}</span>
            <span className="mt-[3px] block tabular-nums text-[#8b5140]">{product.product_type === "kit" && product.from_price != null ? "Từ " : ""}{formatVND(price)}</span>
          </button>;
        })
      ) : gallery.length ? (
        <div className="space-y-2 py-2">{gallery.map(([src, variantName], index) => <button key={`${src}-${index}`} type="button" aria-label={variantName ? `Mở ảnh biến thể ${variantName}` : `Mở ảnh sản phẩm ${index + 1}`} onClick={() => onShowImage(src)} className="group relative block w-full overflow-hidden rounded-lg bg-[#eee9e1] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9b3f1c]"><Image src={src} alt={variantName ? `${activeProduct.name} — ${variantName}` : `${activeProduct.name} — ảnh ${index + 1}`} width={800} height={600} sizes="220px" className="h-auto w-full object-contain"/>{variantName && <span className="absolute bottom-0 right-0 max-w-full truncate rounded-tl-md bg-[#211916]/75 px-2 py-1 text-right text-[9px] font-bold text-white">{variantName}</span>}</button>)}</div>
      ) : (
        <div className="flex min-h-32 flex-col items-center justify-center gap-2 px-4 text-center text-xs text-[#76675f]"><Package className="h-6 w-6 text-[#9b8b83]" aria-hidden="true" />Chưa có ảnh sản phẩm</div>
      )}
    </div>
  </aside>;
}
