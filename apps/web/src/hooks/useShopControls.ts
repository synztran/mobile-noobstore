"use client";

import type { FilterState } from "@/components/product/FilterOverlay";
import type { SortOption } from "@/app/api/products/route";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function readFilters(sp: URLSearchParams) {
  return {
    search: sp.get("search") ?? "",
    sort: (sp.get("sort") as SortOption) ?? "newest",
    filterState: {
      category: sp.get("category") || null,
      priceMin: Number(sp.get("priceMin") ?? 0),
      priceMax: Number(sp.get("priceMax") ?? 0),
    } as FilterState,
  };
}

function buildQueryString(
  search: string,
  sort: SortOption,
  filter: FilterState
): string {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (sort !== "newest") params.set("sort", sort);
  if (filter.category) params.set("category", filter.category);
  if (filter.priceMin > 0) params.set("priceMin", String(filter.priceMin));
  if (filter.priceMax > 0) params.set("priceMax", String(filter.priceMax));
  const qs = params.toString();
  return qs ? `/shop?${qs}` : "/shop";
}

export function useShopControls(onSearchCommitted?: (term: string) => void) {
  const router = useRouter();
  const sp = useSearchParams();

  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOption>("newest");
  const [filterState, setFilterState] = useState<FilterState>({
    category: null,
    priceMin: 0,
    priceMax: 0,
  });
  const [showFilter, setShowFilter] = useState(false);
  const [showSort, setShowSort] = useState(false);
  const [isSearchPending, setIsSearchPending] = useState(false);

  const isFirstRender = useRef(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onSearchCommittedRef = useRef(onSearchCommitted);

  useEffect(() => {
    onSearchCommittedRef.current = onSearchCommitted;
  }, [onSearchCommitted]);

  // Sync URL → internal state (browser back/forward)
  useEffect(() => {
    const { search: s, sort: so, filterState: f } = readFilters(sp);
    setSearch(s);
    setSort(so);
    setFilterState(f);
  }, [sp]);

  const commit = useCallback(
    (newSearch: string, newSort: SortOption, newFilter: FilterState) => {
      router.replace(buildQueryString(newSearch, newSort, newFilter), {
        scroll: false,
      });
    },
    [router]
  );

  // Debounced search
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setIsSearchPending(true);
    debounceRef.current = setTimeout(
      () => {
        commit(search, sort, filterState);
        setIsSearchPending(false);
        const trimmed = search.trim();
        if (trimmed) onSearchCommittedRef.current?.(trimmed);
      },
      search ? 500 : 0
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
      commit(search, v, filterState);
    },
    [search, filterState, commit]
  );

  const handleApplyFilter = useCallback(
    (state: FilterState) => {
      setFilterState(state);
      commit(search, sort, state);
    },
    [search, sort, commit]
  );

  const handleClearFilters = useCallback(() => {
    const cleared: FilterState = {
      category: null,
      priceMin: 0,
      priceMax: 0,
    };
    setFilterState(cleared);
    commit(search, sort, cleared);
  }, [search, sort, commit]);

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
    isSearchPending,
    setSearch,
    handleSort,
    handleApplyFilter,
    handleClearFilters,
    setShowFilter,
    setShowSort,
  };
}
