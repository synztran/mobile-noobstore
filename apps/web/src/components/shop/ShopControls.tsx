"use client";

import type { FilterState } from "@/components/product/FilterOverlay";
import { FilterOverlay } from "@/components/product/FilterOverlay";
import Icon from "@/components/ui/Icon";
import { formatVND } from "@/lib/currency";
import type { CategoryItem } from "@/lib/products-server";
import { SORT_OPTIONS } from "@/constants/shop";
import { SortSheet } from "./SortSheet";
import { useShopControls } from "@/hooks/useShopControls";
import type { Filters } from "@/lib/react-query/shop/api/useShopInfiniteQuery";

function formatFilterPills(filters: FilterState): string[] {
  const pills: string[] = [];
  if (filters.category) pills.push(filters.category);
  const hasMin = filters.priceMin > 0;
  const hasMax = filters.priceMax > 0;
  if (hasMin && hasMax) {
    pills.push(
      `${formatVND(filters.priceMin)} – ${formatVND(filters.priceMax)}`
    );
  } else if (hasMin) {
    pills.push(`Từ ${formatVND(filters.priceMin)}`);
  } else if (hasMax) {
    pills.push(`Đến ${formatVND(filters.priceMax)}`);
  }
  return pills;
}

type ExternalFilters = Pick<
  Filters,
  "search" | "category" | "sort" | "priceMin" | "priceMax"
>;

export function ShopControls({
  total,
  categories = [],
  filters: externalFilters,
  onFiltersChange,
}: {
  total: number;
  categories?: CategoryItem[];
  filters: ExternalFilters;
  onFiltersChange: (f: ExternalFilters) => void;
}) {
  const {
    search,
    sort,
    filterState,
    showFilter,
    showSort,
    filterApplied,
    setSearch,
    handleSort,
    handleApplyFilter,
    handleClearFilters,
    setShowFilter,
    setShowSort,
  } = useShopControls(externalFilters, onFiltersChange);

  return (
    <>
      {/* Search bar */}
      <div className="mb-6 flex items-center gap-3 rounded-full bg-surface-container px-3 py-3.5">
        <Icon name="search" className="text-outline" />
        <input
          type="search"
          placeholder="Tìm kiếm sản phẩm..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-transparent font-medium text-on-surface outline-none placeholder:text-outline"
        />
      </div>

      {/* Header row */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="mb-1 text-xs font-bold uppercase tracking-widest text-on-surface-variant">
            Bộ sưu tập
          </p>
          <p className="text-2xl font-black tracking-tighter">
            {total} kết quả
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowFilter(true)}
            className={`flex items-center gap-2 rounded-full px-4 py-2.5 text-xs font-bold transition-colors ${
              filterApplied
                ? "bg-primary text-on-primary"
                : "bg-surface-container text-on-surface"
            }`}
          >
            <Icon name="tune" className="text-base" />
            Lọc
          </button>
          <button
            onClick={() => setShowSort(true)}
            className="primary-gradient flex items-center gap-2 rounded-full px-4 py-2.5 text-xs font-bold text-white"
          >
            {SORT_OPTIONS.find((o) => o.value === sort)?.icon}
            Sắp xếp
          </button>
        </div>
      </div>

      {/* Active filter pills */}
      {filterApplied && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {formatFilterPills(filterState).map((p) => (
            <span
              key={p}
              className="rounded-full bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-primary"
            >
              {p}
            </span>
          ))}
          <button
            onClick={handleClearFilters}
            className="text-[10px] font-bold text-outline underline"
          >
            Xóa tất cả
          </button>
        </div>
      )}

      <FilterOverlay
        isOpen={showFilter}
        onClose={() => setShowFilter(false)}
        onApply={handleApplyFilter}
        initialState={filterState}
        categories={categories}
      />

      <SortSheet
        isOpen={showSort}
        current={sort}
        onSelect={handleSort}
        onClose={() => setShowSort(false)}
      />
    </>
  );
}
