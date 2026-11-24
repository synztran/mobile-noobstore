"use client";

import type { FilterState } from "@/modules/products/ui/product/FilterOverlay";
import { FilterOverlay } from "@/modules/products/ui/product/FilterOverlay";
import { SearchExpandPanel } from "@/modules/products/ui/shop/SearchExpandPanel";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { formatVND } from "@/lib/currency";
import type { CategoryItem } from "@/modules/products/server/ssr";
import { SORT_OPTIONS } from "@/constants/shop";
import { ShopTour } from "./ShopTour";
import { SortSheet } from "./SortSheet";
import type { useShopControls } from "@/modules/products/client/useShopControls";
import type { useRecentSearches } from "@/modules/products/client/useRecentSearches";
import type { SortOption } from "@/modules/products/types";
import { useCallback, useEffect, useRef, useState } from "react";

type ShopControlsState = ReturnType<typeof useShopControls>;
type RecentSearchesState = ReturnType<typeof useRecentSearches>;


function formatFilterPills(filters: FilterState): string[] {
  const pills: string[] = [];
  if (filters.category.length) pills.push(...filters.category);
  if (filters.brand.length) pills.push(...filters.brand);
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

export function ShopControls({
  total,
  categories = [],
  brands = [],
  isTotalLoading = false,
  isSearching = false,
  controls,
  recents,
}: {
  total: number;
  categories?: CategoryItem[];
  brands?: string[];
  isTotalLoading?: boolean;
  isSearching?: boolean;
  controls: ShopControlsState;
  recents: RecentSearchesState;
}) {
  const {
    searches: recentSearches,
    addSearch,
    removeSearch,
    clearSearches,
  } = recents;

  const {
    search,
    sort,
    filterState,
    showFilter,
    showSort,
    filterApplied,
    isSearchPending,
    setSearch,
    handleSort,
    handleApplyFilter,
    handleClearFilters,
    setShowFilter,
    setShowSort,
  } = controls;

  // Dropdown shows only while the input is focused with an empty/short query;
  // once the user starts typing it hides and the grid filters live (as before).
  const [focused, setFocused] = useState(false);
  const showPanel = focused && search.length < 2;
  const searchWrapRef = useRef<HTMLDivElement>(null);

  const handlePanelSearch = useCallback(
    (term: string) => {
      addSearch(term);
      setSearch(term);
      setFocused(false);
    },
    [addSearch, setSearch]
  );

  const handleSelectCategory = useCallback(
    (slug: string) => {
      handleApplyFilter({ ...filterState, category: [slug] });
      setFocused(false);
    },
    [handleApplyFilter, filterState]
  );

  // Close the dropdown on outside click
  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (
        searchWrapRef.current &&
        !searchWrapRef.current.contains(e.target as Node)
      ) {
        setFocused(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  return (
    <>
      {/* Search bar — typing filters the grid; focus reveals recent + category shortcuts */}
      <div ref={searchWrapRef} className="relative mb-4">
        <div
          data-tour="search"
          className="flex items-center gap-2 rounded-md border border-outline-variant bg-white px-3 py-3.5"
        >
          <Search className="h-4 w-4 text-outline" />
          <input
            type="text"
            placeholder="Tìm kiếm sản phẩm..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onFocus={() => setFocused(true)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === "Escape") setFocused(false);
            }}
            className="flex-1 bg-transparent font-medium text-on-surface outline-none placeholder:text-outline"
          />
          {(isSearching || isSearchPending) && search ? (
            <span className="loading loading-spinner loading-sm text-primary" />
          ) : search ? (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="flex items-center justify-center text-outline transition-colors hover:text-on-surface"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        <SearchExpandPanel
          open={showPanel}
          categories={categories}
          recentSearches={recentSearches}
          onSearch={handlePanelSearch}
          onRemoveRecent={removeSearch}
          onClearRecent={clearSearches}
          onSelectCategory={handleSelectCategory}
        />
      </div>

      {/* Header row */}
      <div className="mb-4 flex items-center justify-between">
        <div data-tour="results">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
            Bộ sưu tập
          </p>
          {isTotalLoading ? (
            <div className="skeleton h-7 w-28 rounded-md bg-surface-container" />
          ) : (
            <p className="text-xl font-bold tracking-tighter">
              {total} kết quả
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {/* <ShopTour /> */}
          <button
            data-tour="filter"
            onClick={() => setShowFilter(true)}
            className={`flex items-center gap-2 rounded-full px-4 py-2.5 text-xs font-bold transition-colors lg:hidden ${
              filterApplied
                ? "bg-primary text-on-primary"
                : "bg-surface-container text-on-surface"
            }`}
          >
            <SlidersHorizontal className="h-4 w-4" />
            Lọc
          </button>
          <button
            data-tour="sort"
            onClick={() => setShowSort(true)}
            className="flex items-center gap-2 rounded-full bg-surface-container px-4 py-2.5 text-xs font-bold text-on-surface transition-colors lg:hidden"
          >
            {SORT_OPTIONS.find((o) => o.value === sort)?.icon}
            Sắp xếp
          </button>
          <select
            aria-label="Sắp xếp sản phẩm"
            value={sort}
            onChange={(e) => handleSort(e.target.value as SortOption)}
            className="hidden rounded-xl border border-outline-variant/40 bg-surface-container py-2.5 pl-4 pr-10 text-xs font-bold text-on-surface outline-none transition-colors focus:border-primary lg:block [background-position:right_1.25rem_center]"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Active filter pills */}
      {filterApplied && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {formatFilterPills(filterState).map((p) => (
            <span
              key={p}
              className="rounded-full bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-primary"
            >
              {p}
            </span>
          ))}
          <button
            onClick={handleClearFilters}
            className="text-[11px] font-semibold text-outline underline"
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
        brands={brands}
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
