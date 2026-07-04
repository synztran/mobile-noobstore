"use client";

import { DualRangeSlider } from "@/components/ui/DualRangeSlider";
import Icon from "@/components/ui/Icon";
import clsx from "clsx";
import { useEffect, useState } from "react";

export interface FilterState {
  category: string | null;
  priceMin: number;
  priceMax: number;
}

const DEFAULT_FILTER_STATE: FilterState = {
  category: null,
  priceMin: 0,
  priceMax: 0,
};

interface FilterOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onApply?: (state: FilterState) => void;
  initialState?: Partial<FilterState>;
  categories?: { id: string; slug: string; name: string }[];
}

export function FilterOverlay({
  isOpen,
  onClose,
  onApply,
  initialState,
  categories = [],
}: FilterOverlayProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(
    initialState?.category ?? null
  );
  const [selectedPriceMin, setSelectedPriceMin] = useState<number>(
    initialState?.priceMin ?? 0
  );
  const [selectedPriceMax, setSelectedPriceMax] = useState<number>(
    initialState?.priceMax ?? 0
  );

  useEffect(() => {
    setSelectedCategory(initialState?.category ?? null);
    setSelectedPriceMin(initialState?.priceMin ?? 0);
    setSelectedPriceMax(initialState?.priceMax ?? 0);
  }, [initialState?.category, initialState?.priceMin, initialState?.priceMax]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[60] bg-on-surface/30 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
      />

      {/* Panel — slides from top */}
      <div
        className={`fixed left-0 right-0 z-[70] flex flex-col overflow-hidden rounded-b-3xl bg-white shadow-2xl transition-all duration-300 ease-out ${
          isOpen ? "bottom-[10vh] top-0" : "bottom-[110%] top-[-110%]"
        }`}
      >
        {/* Header */}
        <div className="flex flex-none items-center justify-between border-b border-outline-variant/20 px-6 py-5">
          <h2 className="text-xl font-black text-on-surface">Lọc sản phẩm</h2>
          <button
            onClick={onClose}
            className="rounded-xl border border-outline-variant/40 bg-surface-container px-3 py-1.5 text-xs font-bold text-on-surface transition-all active:scale-90"
          >
            Đóng
          </button>
        </div>

        <div className="hide-scrollbar flex-1 space-y-6 overflow-y-auto px-6 py-4 pb-4">
          {/* Category */}
          {categories.length > 0 && (
            <section>
              <h3 className="mb-3 text-base font-black text-on-surface">
                Danh mục
              </h3>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={clsx(
                    "rounded-xl px-4 py-2 text-sm font-bold transition-all",
                    selectedCategory === null
                      ? "bg-primary text-on-primary"
                      : "bg-surface-container text-on-surface"
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
                      "rounded-xl px-4 py-2 text-sm font-bold transition-all",
                      selectedCategory === cat.slug
                        ? "bg-primary text-on-primary"
                        : "bg-surface-container text-on-surface"
                    )}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Price range */}
          <section>
            <h3 className="mb-3 text-base font-black text-on-surface">
              Khoảng giá
            </h3>
            <DualRangeSlider
              min={selectedPriceMin}
              max={selectedPriceMax}
              onChange={(min, max) => {
                setSelectedPriceMin(min);
                setSelectedPriceMax(max);
              }}
            />
          </section>
        </div>

        {/* Footer */}
        <div className="flex flex-none items-center justify-between border-t border-outline-variant/20 bg-white px-6 py-4">
          <button
            onClick={() => {
              setSelectedCategory(null);
              setSelectedPriceMin(0);
              setSelectedPriceMax(0);
            }}
            className="text-sm font-bold text-on-surface"
          >
            Đặt lại
          </button>
          <button
            onClick={() => {
              onApply?.({
                category: selectedCategory,
                priceMin: selectedPriceMin,
                priceMax: selectedPriceMax,
              });
              onClose();
            }}
            className="primary-gradient btn h-auto rounded-2xl border-0 px-8 py-3 font-bold normal-case text-white"
          >
            Áp dụng
          </button>
        </div>
      </div>
    </>
  );
}
