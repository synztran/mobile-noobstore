"use client";

import type { SortOption } from "@/app/api/products/route";
import {
	FilterOverlay,
	type FilterState,
} from "@/components/product/FilterOverlay";
import Icon from "@/components/ui/Icon";
import { formatVND } from "@/lib/currency";
import type { CategoryItem } from "@/lib/products-server";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { SORT_OPTIONS, SortSheet } from "./SortSheet";

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

// ─── Controls ─────────────────────────────────────────────────────────────────

export function ShopControls({
	total,
	categories = [],
}: {
	total: number;
	categories?: CategoryItem[];
}) {
	const router = useRouter();
	const sp = useSearchParams();

	const [search, setSearch] = useState(sp.get("search") ?? "");
	const [sort, setSort] = useState<SortOption>(
		(sp.get("sort") as SortOption) ?? "newest",
	);
	const [filters, setFilters] = useState<FilterState>({
		category: sp.get("category") ?? null,
		priceMin: Number(sp.get("priceMin") ?? 0),
		priceMax: Number(sp.get("priceMax") ?? 0),
	});
	const [showFilter, setShowFilter] = useState(false);
	const [showSort, setShowSort] = useState(false);
	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const isFirstRender = useRef(true);

	// Push all state to URL — server re-renders with new data
	const pushParams = (
		newSearch: string,
		newSort: SortOption,
		newFilters: FilterState,
	) => {
		const params = new URLSearchParams();
		if (newSearch) params.set("search", newSearch);
		if (newSort !== "newest") params.set("sort", newSort);
		if (newFilters.category) params.set("category", newFilters.category);
		if (newFilters.priceMin > 0)
			params.set("priceMin", String(newFilters.priceMin));
		if (newFilters.priceMax > 0)
			params.set("priceMax", String(newFilters.priceMax));
		router.push(`/shop?${params.toString()}`);
	};

	// Debounced search
	useEffect(() => {
		if (isFirstRender.current) {
			isFirstRender.current = false;
			return;
		}
		if (debounceRef.current) clearTimeout(debounceRef.current);
		debounceRef.current = setTimeout(
			() => pushParams(search, sort, filters),
			search ? 400 : 0,
		);
		return () => {
			if (debounceRef.current) clearTimeout(debounceRef.current);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [search]);

	const handleSort = (v: SortOption) => {
		setSort(v);
		pushParams(search, v, filters);
	};

	const handleApplyFilter = (state: FilterState) => {
		setFilters(state);
		pushParams(search, sort, state);
	};

	const handleClearFilters = () => {
		const cleared: FilterState = {
			category: null,
			priceMin: 0,
			priceMax: 0,
		};
		setFilters(cleared);
		pushParams(search, sort, cleared);
	};

	// Lock body scroll when overlays open
	useEffect(() => {
		document.body.style.overflow = showFilter || showSort ? "hidden" : "";
		return () => {
			document.body.style.overflow = "";
		};
	}, [showFilter, showSort]);

	const filterApplied =
		filters.category !== null ||
		filters.priceMin > 0 ||
		filters.priceMax > 0;

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
				{search && (
					<button
						onClick={() => setSearch("")}
						className="text-outline">
						<Icon name="close" className="text-sm" />
					</button>
				)}
			</div>

			{/* Header row */}
			<div className="flex justify-between items-center mb-4">
				<div>
					<p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-1">
						Bộ sưu tập
					</p>
					<h2 className="text-2xl font-black tracking-tighter">
						{total} kết quả
					</h2>
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
					{formatFilterPills(filters).map((p) => (
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
				initialState={filters}
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
