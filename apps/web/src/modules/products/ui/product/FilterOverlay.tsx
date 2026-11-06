"use client";

import { DualRangeSlider } from "@/components/ui/DualRangeSlider";
import clsx from "clsx";
import { Banknote, Check, LayoutGrid, RotateCcw, Store } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export interface FilterState {
  category: string | null;
  brand: string | null;
  priceMin: number;
  priceMax: number;
}

const DEFAULT_FILTER_STATE: FilterState = {
  category: null,
  brand: null,
  priceMin: 0,
  priceMax: 0,
};

interface FilterOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onApply?: (state: FilterState) => void;
  initialState?: Partial<FilterState>;
  categories?: { id: string; slug: string; name: string }[];
  brands?: string[];
}

export function FilterOverlay({
  isOpen,
  onClose,
  onApply,
  initialState,
  categories = [],
  brands = [],
}: FilterOverlayProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(
    initialState?.category ?? null
  );
  const [selectedBrand, setSelectedBrand] = useState<string | null>(
    initialState?.brand ?? null
  );
  const [selectedPriceMin, setSelectedPriceMin] = useState<number>(
    initialState?.priceMin ?? 0
  );
  const [selectedPriceMax, setSelectedPriceMax] = useState<number>(
    initialState?.priceMax ?? 0
  );

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

  const activeCount = useMemo(() => {
    let n = 0;
    if (selectedCategory) n++;
    if (selectedBrand) n++;
    if (selectedPriceMin > 0 || selectedPriceMax > 0) n++;
    return n;
  }, [selectedCategory, selectedBrand, selectedPriceMin, selectedPriceMax]);

  useEffect(() => {
    setSelectedCategory(initialState?.category ?? null);
    setSelectedBrand(initialState?.brand ?? null);
    setSelectedPriceMin(initialState?.priceMin ?? 0);
    setSelectedPriceMax(initialState?.priceMax ?? 0);
  }, [
    initialState?.category,
    initialState?.brand,
    initialState?.priceMin,
    initialState?.priceMax,
  ]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[60] bg-on-surface/40 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        }`}
      />

      {/* Panel — slides from top */}
      <div
        className={`fixed left-0 right-0 z-[70] flex flex-col overflow-hidden rounded-b-3xl bg-surface pt-[env(safe-area-inset-top,0px)] shadow-[0_-8px_30px_rgba(0,0,0,0.12)] transition-all duration-300 ease-out ${
          isOpen ? "bottom-[8vh] top-0" : "bottom-[110%] top-[-110%]"
        }`}
      >
        {/* Drag handle */}
        <div className="flex justify-center pb-1 pt-2">
          <div className="h-1 w-10 rounded-full bg-outline-variant/40" />
        </div>

        {/* Header */}
        <div className="flex flex-none items-center justify-between border-b border-outline-variant/15 px-6 pb-4 pt-2">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-black text-on-surface">Lọc sản phẩm</h2>
            {activeCount > 0 && (
              <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-black text-on-primary">
                {activeCount}
              </span>
            )}
          </div>
          <button
            onClick={() => {
              setSelectedCategory(null);
              setSelectedBrand(null);
              setSelectedPriceMin(0);
              setSelectedPriceMax(0);
            }}
            className={clsx(
              "flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-bold transition-all duration-200 active:scale-95",
              activeCount > 0
                ? "border-primary/30 text-primary hover:bg-primary/5"
                : "border-outline-variant/40 text-on-surface-variant"
            )}
          >
            <RotateCcw className="h-4 w-4" />
            Đặt lại
          </button>
        </div>

        <div className="hide-scrollbar flex-1 space-y-5 overflow-y-auto px-6 py-5">
          {/* Category */}
          {categories.length > 0 && (
            <section
              className={clsx(
                "transition-all duration-300",
                isOpen ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
              )}
              style={{ transitionDelay: isOpen ? "50ms" : "0ms" }}
            >
              <div className="mb-3 flex items-center gap-2">
                <LayoutGrid className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-black uppercase tracking-wide text-on-surface">
                  Danh mục
                </h3>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={clsx(
                    "rounded-full border px-4 py-2 text-sm font-bold transition-all duration-200",
                    selectedCategory === null
                      ? "border-primary bg-primary text-on-primary shadow-sm shadow-primary/20"
                      : "border-outline-variant/40 bg-transparent text-on-surface-variant hover:border-outline hover:text-on-surface"
                  )}
                >
                  Tất cả
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() =>
                      setSelectedCategory(
                        cat.slug === selectedCategory ? null : cat.slug
                      )
                    }
                    className={clsx(
                      "rounded-full border px-4 py-2 text-sm font-bold transition-all duration-200",
                      selectedCategory === cat.slug
                        ? "border-primary bg-primary text-on-primary shadow-sm shadow-primary/20"
                        : "border-outline-variant/40 bg-transparent text-on-surface-variant hover:border-outline hover:text-on-surface"
                    )}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Brand */}
          {uniqueBrands.length > 0 && (
            <section
              className={clsx(
                "transition-all duration-300",
                isOpen ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
              )}
              style={{ transitionDelay: isOpen ? "100ms" : "0ms" }}
            >
              <div className="mb-3 flex items-center gap-2">
                <Store className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-black uppercase tracking-wide text-on-surface">
                  Thương hiệu
                </h3>
              </div>
              <div className="hide-scrollbar flex max-h-[130px] flex-wrap gap-2 overflow-y-auto pr-1">
                <button
                  onClick={() => setSelectedBrand(null)}
                  className={clsx(
                    "rounded-full border px-4 py-2 text-sm font-bold transition-all duration-200",
                    selectedBrand === null
                      ? "border-primary bg-primary text-on-primary shadow-sm shadow-primary/20"
                      : "border-outline-variant/40 bg-transparent text-on-surface-variant hover:border-outline hover:text-on-surface"
                  )}
                >
                  Tất cả
                </button>
                {uniqueBrands.map((b) => (
                  <button
                    key={b}
                    onClick={() =>
                      setSelectedBrand(selectedBrand === b ? null : b)
                    }
                    className={clsx(
                      "rounded-full border px-4 py-2 text-sm font-bold transition-all duration-200",
                      selectedBrand === b
                        ? "border-primary bg-primary text-on-primary shadow-sm shadow-primary/20"
                        : "border-outline-variant/40 bg-transparent text-on-surface-variant hover:border-outline hover:text-on-surface"
                    )}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Price range */}
          <section
            className={clsx(
              "transition-all duration-300",
              isOpen ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
            )}
            style={{ transitionDelay: isOpen ? "150ms" : "0ms" }}
          >
            <div className="mb-3 flex items-center gap-2">
              <Banknote className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-black uppercase tracking-wide text-on-surface">
                Khoảng giá
              </h3>
            </div>
            <div className="rounded-2xl bg-surface-container p-4">
              <DualRangeSlider
                min={selectedPriceMin}
                max={selectedPriceMax}
                onChange={(min, max) => {
                  setSelectedPriceMin(min);
                  setSelectedPriceMax(max);
                }}
              />
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="flex flex-none items-center gap-3 border-t border-outline-variant/15 bg-surface px-6 py-4">
          <button
            onClick={onClose}
            className="flex items-center justify-center rounded-full border border-outline-variant/40 px-5 py-2.5 text-sm font-bold text-on-surface-variant transition-all duration-200 hover:bg-surface-container active:scale-[0.97]"
          >
            Đóng
          </button>
          <button
            onClick={() => {
              onApply?.({
                category: selectedCategory,
                brand: selectedBrand,
                priceMin: selectedPriceMin,
                priceMax: selectedPriceMax,
              });
              onClose();
            }}
            className="primary-gradient flex flex-1 items-center justify-center gap-2 rounded-full py-2.5 text-sm font-black text-on-primary shadow-md shadow-primary/20 transition-all duration-200 active:scale-[0.97]"
          >
            <Check className="h-4 w-4" />
            Áp dụng
          </button>
        </div>
      </div>
    </>
  );
}
