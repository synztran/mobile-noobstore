"use client";

import type { FilterState } from "@/components/product/FilterOverlay";
import type { SortOption } from "@/app/api/products/route";
import type { Filters } from "@/lib/react-query/shop/api/useShopInfiniteQuery";
import { useCallback, useEffect, useRef, useState } from "react";

type ExternalFilters = Pick<
  Filters,
  "search" | "category" | "sort" | "priceMin" | "priceMax"
>;

export function useShopControls(
  externalFilters: ExternalFilters,
  onFiltersChange: (f: ExternalFilters) => void
) {
  const [search, setSearch] = useState(externalFilters.search ?? "");
  const [sort, setSort] = useState<SortOption>(
    (externalFilters.sort as SortOption) ?? "newest"
  );
  const [filterState, setFilterState] = useState<FilterState>({
    category: externalFilters.category || null,
    priceMin: Number(externalFilters.priceMin ?? 0),
    priceMax: Number(externalFilters.priceMax ?? 0),
  });
  const [showFilter, setShowFilter] = useState(false);
  const [showSort, setShowSort] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRender = useRef(true);

  // Sync external → internal when URL changes (browser back/forward)
  useEffect(() => {
    setSearch(externalFilters.search ?? "");
    setSort((externalFilters.sort as SortOption) ?? "newest");
    setFilterState({
      category: externalFilters.category || null,
      priceMin: Number(externalFilters.priceMin ?? 0),
      priceMax: Number(externalFilters.priceMax ?? 0),
    });
  }, [externalFilters]);

  const commitFilters = useCallback(
    (newSearch: string, newSort: SortOption, newFilter: FilterState) => {
      const params = new URLSearchParams();
      if (newSearch) params.set("search", newSearch);
      if (newSort !== "newest") params.set("sort", newSort);
      if (newFilter.category) params.set("category", newFilter.category);
      if (newFilter.priceMin > 0)
        params.set("priceMin", String(newFilter.priceMin));
      if (newFilter.priceMax > 0)
        params.set("priceMax", String(newFilter.priceMax));
      const qs = params.toString();
      window.history.replaceState(null, "", qs ? `/shop?${qs}` : "/shop");

      onFiltersChange({
        search: newSearch || undefined,
        category: newFilter.category ?? undefined,
        sort: newSort === "newest" ? undefined : newSort,
        priceMin:
          newFilter.priceMin > 0 ? String(newFilter.priceMin) : undefined,
        priceMax:
          newFilter.priceMax > 0 ? String(newFilter.priceMax) : undefined,
      });
    },
    [onFiltersChange]
  );

  // Debounced search
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(
      () => commitFilters(search, sort, filterState),
      search ? 400 : 0
    );
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  // Lock body scroll when overlays open
  useEffect(() => {
    document.body.style.overflow = showFilter || showSort ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [showFilter, showSort]);

  const handleSort = useCallback(
    (v: SortOption) => {
      setSort(v);
      commitFilters(search, v, filterState);
    },
    [search, filterState, commitFilters]
  );

  const handleApplyFilter = useCallback(
    (state: FilterState) => {
      setFilterState(state);
      commitFilters(search, sort, state);
    },
    [search, sort, commitFilters]
  );

  const handleClearFilters = useCallback(() => {
    const cleared: FilterState = {
      category: null,
      priceMin: 0,
      priceMax: 0,
    };
    setFilterState(cleared);
    commitFilters(search, sort, cleared);
  }, [search, sort, commitFilters]);

  const filterApplied =
    filterState.category !== null ||
    filterState.priceMin > 0 ||
    filterState.priceMax > 0;

  return {
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
  };
}
