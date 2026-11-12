"use client";

import { DualRangeSlider } from "@/components/ui/DualRangeSlider";
import type { FilterState } from "@/modules/products/ui/product/FilterOverlay";
import clsx from "clsx";
import { Banknote, Check, LayoutGrid, RotateCcw, Store } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const DEFAULT_FILTER_STATE: FilterState = {
  category: null,
  brand: null,
  priceMin: 0,
  priceMax: 0,
};

interface ShopFilterPanelProps {
  categories?: { id: string; slug: string; name: string }[];
  brands?: string[];
  initialState?: Partial<FilterState>;
  onApply: (state: FilterState) => void;
  onClear: () => void;
  className?: string;
}

/**
 * Desktop filter rail.
 *
 * Unlike the mobile `FilterOverlay` (a modal with an apply step), this panel is
 * always visible beside the grid at `lg+`. It still keeps a local draft so
 * dragging the price slider does not fire a URL commit on every pointer move —
 * the draft is written to the URL only when "Áp dụng" is pressed. Reset applies
 * immediately because there is nothing to confirm.
 *
 * Filter state stays URL-authoritative: `initialState` is re-synced whenever the
 * query string changes (back/forward, shared link), and `onApply` calls the same
 * handler as the mobile overlay.
 */
export function ShopFilterPanel({
  categories = [],
  brands = [],
  initialState,
  onApply,
  onClear,
  className,
}: ShopFilterPanelProps) {
  const [category, setCategory] = useState<string | null>(
    initialState?.category ?? null
  );
  const [brand, setBrand] = useState<string | null>(initialState?.brand ?? null);
  const [priceMin, setPriceMin] = useState<number>(initialState?.priceMin ?? 0);
  const [priceMax, setPriceMax] = useState<number>(initialState?.priceMax ?? 0);
  const [showAllBrands, setShowAllBrands] = useState(false);

  useEffect(() => {
    setCategory(initialState?.category ?? null);
    setBrand(initialState?.brand ?? null);
    setPriceMin(initialState?.priceMin ?? 0);
    setPriceMax(initialState?.priceMax ?? 0);
  }, [
    initialState?.category,
    initialState?.brand,
    initialState?.priceMin,
    initialState?.priceMax,
  ]);

  const uniqueBrands = useMemo(() => {
    const seen = new Map<string, string>();
    for (const b of brands) {
      const trimmed = b.trim();
      if (!trimmed) continue;
      const key = trimmed.toLowerCase();
      if (!seen.has(key)) seen.set(key, trimmed);
    }
    return Array.from(seen.values());
  }, [brands]);

  const activeCount =
    (category ? 1 : 0) +
    (brand ? 1 : 0) +
    (priceMin > 0 || priceMax > 0 ? 1 : 0);

  const dirty =
    category !== (initialState?.category ?? null) ||
    brand !== (initialState?.brand ?? null) ||
    priceMin !== (initialState?.priceMin ?? 0) ||
    priceMax !== (initialState?.priceMax ?? 0);

  const reset = () => {
    setCategory(null);
    setBrand(null);
    setPriceMin(0);
    setPriceMax(0);
    onClear();
  };

  return (
    <div
      className={clsx(
        "rounded-2xl border border-outline-variant/30 bg-surface p-5",
        className
      )}
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-black uppercase tracking-wide text-on-surface">
            Bộ lọc
          </h2>
          {activeCount > 0 && (
            <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-black text-on-primary">
              {activeCount}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={reset}
          disabled={activeCount === 0}
          className={clsx(
            "flex items-center gap-1 text-xs font-bold transition-colors",
            activeCount > 0
              ? "text-primary hover:text-primary/80"
              : "cursor-not-allowed text-outline-variant"
          )}
        >
          <RotateCcw className="h-3 w-3" />
          Đặt lại
        </button>
      </div>

      {categories.length > 0 && (
        <section className="border-t border-outline-variant/15 py-4">
          <div className="mb-2 flex items-center gap-2">
            <LayoutGrid className="h-3.5 w-3.5 text-primary" />
            <h3 className="text-xs font-black uppercase tracking-wide text-on-surface-variant">
              Danh mục
            </h3>
          </div>
          <div className="flex flex-col">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() =>
                  setCategory(cat.slug === category ? null : cat.slug)
                }
                className={clsx(
                  "flex items-center justify-between rounded-lg px-2 py-1.5 text-left text-sm transition-colors",
                  category === cat.slug
                    ? "font-bold text-primary"
                    : "text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"
                )}
              >
                {cat.name}
                {category === cat.slug && <Check className="h-3.5 w-3.5" />}
              </button>
            ))}
          </div>
        </section>
      )}

      {uniqueBrands.length > 0 && (
        <section className="border-t border-outline-variant/15 py-4">
          <div className="mb-2 flex items-center gap-2">
            <Store className="h-3.5 w-3.5 text-primary" />
            <h3 className="text-xs font-black uppercase tracking-wide text-on-surface-variant">
              Thương hiệu
            </h3>
          </div>
          <div className="flex flex-wrap gap-1.5">
              {(showAllBrands ? uniqueBrands : uniqueBrands.slice(0, 12)).map(
              (b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => setBrand(brand === b ? null : b)}
                  className={clsx(
                    "rounded-full border px-3 py-1 text-xs font-bold transition-colors",
                    brand === b
                      ? "border-primary bg-primary text-on-primary"
                      : "border-outline-variant/40 text-on-surface-variant hover:border-outline hover:text-on-surface"
                  )}
                >
                  {b}
                </button>
              )
            )}
          </div>
          {uniqueBrands.length > 12 && (
            <button
              type="button"
              onClick={() => setShowAllBrands((v) => !v)}
              className="mt-2 text-xs font-bold text-primary hover:underline"
            >
              {showAllBrands
                ? "Thu gọn"
                : `Xem thêm ${uniqueBrands.length - 12} thương hiệu`}
            </button>
          )}
        </section>
      )}

      <section className="border-t border-outline-variant/15 py-4">
        <div className="mb-2 flex items-center gap-2">
          <Banknote className="h-3.5 w-3.5 text-primary" />
          <h3 className="text-xs font-black uppercase tracking-wide text-on-surface-variant">
            Khoảng giá
          </h3>
        </div>
        <div className="rounded-xl bg-surface-container-low p-3">
          <DualRangeSlider
            min={priceMin}
            max={priceMax}
            desktop
            onChange={(min, max) => {
              setPriceMin(min);
              setPriceMax(max);
            }}
          />
        </div>
      </section>

      <button
        type="button"
        onClick={() =>
          onApply({ category, brand, priceMin, priceMax })
        }
        className={clsx(
          "primary-gradient mt-1 flex w-full items-center justify-center gap-2 rounded-full py-2.5 text-sm font-black text-on-primary transition-all active:scale-[0.97]",
          dirty ? "shadow-md shadow-primary/20" : "opacity-90"
        )}
      >
        <Check className="h-4 w-4" />
        Áp dụng
      </button>
    </div>
  );
}
