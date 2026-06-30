"use client";

import type { SortOption } from "@/app/api/products/route";
import {
	FilterOverlay,
	type FilterState,
} from "@/components/product/FilterOverlay";
import Icon from "@/components/ui/Icon";
import { formatVND } from "@/lib/currency";
import type { CategoryItem } from "@/lib/products-server";
import { useCallback, useEffect, useRef, useState } from "react";
import { SORT_OPTIONS, SortSheet } from "./SortSheet";
import type { Filters } from "@/lib/react-query/shop/api/useShopInfiniteQuery";

function formatFilterPills(filters: FilterState): string[] {
	const pills: string[] = [];
	if (filters.category) pills.push(filters.category);
	const hasMin = filters.priceMin > 0;
	const hasMax = filters.priceMax > 0;
	if (hasMin && hasMax) {
		pills.push(
			`${formatVND(filters.priceMin)} – ${formatVND(filters.priceMax)}`,
		);
	} else if (hasMin) {
		pills.push(`Từ ${formatVND(filters.priceMin)}`);
	} else if (hasMax) {
		pills.push(`Đến ${formatVND(filters.priceMax)}`);
	}
	return pills;
}

function buildUrlString(
	search: string,
	sort: SortOption,
	filters: FilterState,
): string {
	const params = new URLSearchParams();
	if (search) params.set("search", search);
	if (sort !== "newest") params.set("sort", sort);
	if (filters.category) params.set("category", filters.category);
	if (filters.priceMin > 0)
		params.set("priceMin", String(filters.priceMin));
	if (filters.priceMax > 0)
		params.set("priceMax", String(filters.priceMax));
	const qs = params.toString();
	return qs ? `/shop?${qs}` : "/shop";
}

type ExternalFilters = Pick<Filters, "search" | "category" | "sort" | "priceMin" | "priceMax">;

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
	const [search, setSearch] = useState(externalFilters.search ?? "");
	const [sort, setSort] = useState<SortOption>(
		(externalFilters.sort as SortOption) ?? "newest",
	);
	const [filterState, setFilterState] = useState<FilterState>({
		category: externalFilters.category ?? null,
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
			category: externalFilters.category ?? null,
			priceMin: Number(externalFilters.priceMin ?? 0),
			priceMax: Number(externalFilters.priceMax ?? 0),
		});
	}, [externalFilters]);

	const commitFilters = useCallback(
		(newSearch: string, newSort: SortOption, newFilter: FilterState) => {
			const url = buildUrlString(newSearch, newSort, newFilter);
			window.history.replaceState(null, "", url);
			onFiltersChange({
				search: newSearch || undefined,
				category: newFilter.category ?? undefined,
				sort: newSort === "newest" ? undefined : newSort,
				priceMin: newFilter.priceMin > 0 ? String(newFilter.priceMin) : undefined,
				priceMax: newFilter.priceMax > 0 ? String(newFilter.priceMax) : undefined,
			});
		},
		[onFiltersChange],
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
			search ? 400 : 0,
		);
		return () => {
			if (debounceRef.current) clearTimeout(debounceRef.current);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [search]);

	const handleSort = (v: SortOption) => {
		setSort(v);
		commitFilters(search, v, filterState);
	};

	const handleApplyFilter = (state: FilterState) => {
		setFilterState(state);
		commitFilters(search, sort, state);
	};

	const handleClearFilters = () => {
		const cleared: FilterState = {
			category: null,
			priceMin: 0,
			priceMax: 0,
		};
		setFilterState(cleared);
		commitFilters(search, sort, cleared);
	};

	// Lock body scroll when overlays open
	useEffect(() => {
		document.body.style.overflow = showFilter || showSort ? "hidden" : "";
		return () => {
			document.body.style.overflow = "";
		};
	}, [showFilter, showSort]);

	const filterApplied =
		filterState.category !== null ||
		filterState.priceMin > 0 ||
		filterState.priceMax > 0;

	return (
		<>
			{/* Search bar */}
			<div className="flex items-center gap-3 bg-surface-container rounded-full px-3 py-3.5 mb-6">
				<Icon name="search" className="text-outline" />
				<input
					type="search"
					placeholder="Tìm kiếm sản phẩm..."
					value={search}
					onChange={(e) => setSearch(e.target.value)}
					className="flex-1 bg-transparent text-on-surface placeholder:text-outline font-medium outline-none"
				/>
			</div>

			{/* Header row */}
			<div className="flex justify-between items-center mb-4">
				<div>
					<p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-1">
						Bộ sưu tập
					</p>
					<p className="text-2xl font-black tracking-tighter">
						{total} kết quả
					</p>
				</div>
				<div className="flex gap-2">
					<button
						onClick={() => setShowFilter(true)}
						className={`flex items-center gap-2 rounded-full px-4 py-2.5 font-bold text-xs transition-colors ${
							filterApplied
								? "bg-primary text-on-primary"
								: "bg-surface-container text-on-surface"
						}`}>
						<Icon name="tune" className="text-base" />
						Lọc
					</button>
					<button
						onClick={() => setShowSort(true)}
						className="flex items-center gap-2 primary-gradient text-white rounded-full px-4 py-2.5 font-bold text-xs">
						{SORT_OPTIONS.find((o) => o.value === sort)?.icon}
						Sắp xếp
					</button>
				</div>
			</div>

			{/* Active filter pills */}
			{filterApplied && (
				<div className="flex items-center gap-2 flex-wrap mb-4">
					{formatFilterPills(filterState).map((p) => (
						<span
							key={p}
							className="text-[10px] font-bold bg-primary/10 text-primary px-3 py-1 rounded-full uppercase tracking-wide">
							{p}
						</span>
					))}
					<button
						onClick={handleClearFilters}
						className="text-[10px] font-bold text-outline underline">
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
