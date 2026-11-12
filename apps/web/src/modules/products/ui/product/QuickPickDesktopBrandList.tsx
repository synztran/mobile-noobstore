"use client";

import type { ShopProduct } from "@/modules/products/types";
import Image from "next/image";
import { Package } from "lucide-react";

type Props = {
  activeProduct: ShopProduct | null;
  alternatives: ShopProduct[];
  loading: boolean;
  onSelect: (id: string) => void;
  onShowImage: (image: string) => void;
};

export function QuickPickDesktopBrandList({
  activeProduct,
  alternatives,
  loading,
  onSelect,
  onShowImage,
}: Props) {
  if (!activeProduct) return <aside className="min-h-0 border-r border-outline-variant/30 bg-surface-container-low" />;

  const brandProducts = [activeProduct, ...alternatives];
  const hasAlternatives = alternatives.length > 0;
  const images = Array.from(new Set((activeProduct.images ?? []).filter(Boolean)));

  return (
    <aside className="flex min-h-0 flex-col border-r border-outline-variant/30 bg-surface-container-low">
      <div className="shrink-0 px-4 pb-3 pt-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-xs font-black uppercase tracking-wide text-on-surface">
            {hasAlternatives ? "Cùng thương hiệu" : "Ảnh sản phẩm"}
          </h3>
          {hasAlternatives && (
            <span className="text-[10px] tabular-nums text-on-surface-variant">
              {brandProducts.length} sản phẩm
            </span>
          )}
          {!hasAlternatives && images.length > 0 && (
            <span className="text-[10px] tabular-nums text-on-surface-variant">
              {images.length} ảnh
            </span>
          )}
        </div>
        {hasAlternatives ? (
          <p className="mt-1 truncate text-[10px] font-bold uppercase tracking-wider text-primary">
            {activeProduct.brand}
          </p>
        ) : (
          <p className="mt-1 truncate text-[10px] text-on-surface-variant">
            {activeProduct.name}
          </p>
        )}
      </div>

      <div data-allow-scroll className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain px-3 pb-4">
        {hasAlternatives ? (
          <>
            {brandProducts.map((product) => {
              const selected = product.id === activeProduct.id;
              const fromPrice = product.product_type === "kit" && product.from_price != null;
              const price = fromPrice ? product.from_price! : product.min_price || product.base_price;
              return (
                <button
                  key={product.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => !selected && onSelect(product.id)}
                  className={`flex min-h-16 w-full items-center gap-2.5 rounded-xl border p-2.5 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${selected ? "border-primary/50 bg-primary/5" : "border-transparent hover:border-outline-variant/40 hover:bg-surface"}`}
                >
                  <div className="relative h-11 w-12 shrink-0 overflow-hidden rounded-lg bg-surface-container-high">
                    {product.thumbnail ? (
                      <Image src={product.thumbnail} alt="" fill sizes="48px" className="object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center"><Package className="h-5 w-5 text-outline-variant" aria-hidden="true" /></div>
                    )}
                  </div>
                  <span className="min-w-0 flex-1">
                    <span className="block line-clamp-2 text-[11px] font-extrabold leading-snug text-on-surface">{product.name}</span>
                    <span className="mt-1 block text-[10px] font-bold text-primary">{fromPrice ? "Từ " : ""}{new Intl.NumberFormat("vi-VN").format(price)} ₫</span>
                  </span>
                  {selected && <span className="shrink-0 text-[8px] font-black uppercase tracking-wide text-primary">Đang chọn</span>}
                </button>
              );
            })}
            {loading && <div className="space-y-2" aria-label="Đang tải sản phẩm cùng thương hiệu">{[0,1].map((i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-surface-container" />)}</div>}
          </>
        ) : images.length > 0 ? (
          images.map((src, index) => (
            <button
              key={`${src}-${index}`}
              type="button"
              aria-label={`Xem ảnh sản phẩm ${index + 1}`}
              onClick={() => onShowImage(src)}
              className="group relative block w-full overflow-hidden rounded-xl bg-surface-container-high focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <Image src={src} alt={`${activeProduct.name} — ảnh ${index + 1}`} width={800} height={600} sizes="(max-width: 1280px) 24vw, 260px" className="h-auto w-full object-contain transition-transform duration-200 group-hover:scale-[1.01]" />
              <span className="absolute left-2 top-2 rounded-md bg-surface/90 px-1.5 py-1 text-[9px] font-black text-on-surface">{index + 1} / {images.length}</span>
            </button>
          ))
        ) : (
          <div className="flex min-h-32 flex-col items-center justify-center gap-2 rounded-xl bg-surface-container px-4 text-center text-xs text-on-surface-variant">
            <Package className="h-6 w-6 text-outline-variant" aria-hidden="true" />
            Chưa có ảnh sản phẩm
          </div>
        )}
      </div>
    </aside>
  );
}
