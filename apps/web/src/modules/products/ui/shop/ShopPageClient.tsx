"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ProductCard,
  ProductCardSkeleton,
} from "@/modules/products/ui/product/ProductCard";
import { ShopControls } from "@/modules/products/ui/shop/ShopControls";
import { ShopFilterPanel } from "@/modules/products/ui/shop/ShopFilterPanel";
import { RecentlyViewedRail } from "@/modules/products/ui/recently-viewed/RecentlyViewedRail";
import type { CategoryItem } from "@/modules/products/server/ssr";
import {
  buildShopFilters,
  useShopInfiniteQuery,
} from "@/modules/products/client/shop-infinite";
import { useShopControls } from "@/modules/products/client/useShopControls";
import { useRecentSearches } from "@/modules/products/client/useRecentSearches";
import type { ProductsResponse, ShopProduct } from "@/modules/products/types";
import { trackViewItemList, toGAProduct } from "@/lib/analytics";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronDown } from "lucide-react";

function ProductGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }, (_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

function EmptyProductState({
  search,
  hasFilters,
  onClearFilters,
}: {
  search?: string;
  hasFilters?: boolean;
  onClearFilters?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-container">
        <svg
          className="h-8 w-8 text-outline-variant"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
          />
        </svg>
      </div>
      <p className="text-sm font-semibold text-on-surface-variant">
        Không tìm thấy sản phẩm phù hợp
        {search ? (
          <>
            {" "}
            với từ khóa <span className="text-primary">"{search}"</span>
          </>
        ) : null}
      </p>
      <p className="text-xs text-outline">
        Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm
      </p>
      {hasFilters && onClearFilters ? (
        <button
          type="button"
          onClick={onClearFilters}
          className="mt-1 rounded-full bg-primary px-4 py-2 text-xs font-bold text-on-primary transition-colors hover:bg-primary/90"
        >
          Xoá bộ lọc
        </button>
      ) : null}
    </div>
  );
}

function ProductGrid({ products }: { products: ShopProduct[] }) {
  return (
    <div
      data-tour="grid"
      className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4"
    >
      <AnimatePresence mode="popLayout">
        {products.map((product, index) => (
          <motion.div
            key={product.id}
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            <ProductCard product={product} imagePriority={index < 2} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function InfiniteScrollSentinel({
  hasNextPage,
  isFetchingNextPage,
  sentinelRef,
}: {
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  sentinelRef: (node: HTMLDivElement | null) => void;
}) {
  const shouldReduceMotion = useReducedMotion();
  if (!hasNextPage) return null;
  return (
    <div
      ref={sentinelRef}
      className="relative flex min-h-16 justify-center py-6"
    >
      {isFetchingNextPage ? (
        <span className="loading loading-spinner loading-sm text-primary" />
      ) : hasNextPage ? (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="pointer-events-none fixed bottom-24 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1 rounded-full bg-surface-container-lowest px-3 py-1.5 text-xs font-semibold text-on-surface-variant shadow-ambient-sm lg:bottom-6"
          aria-hidden="true"
        >
          <span>Cuộn để xem thêm</span>
          <motion.span
            animate={shouldReduceMotion ? undefined : { y: [0, 3, 0] }}
            transition={{ duration: 1.2, repeat: 2, ease: "easeInOut" }}
            className="inline-flex"
          >
            <ChevronDown size={14} />
          </motion.span>
        </motion.div>
      ) : null}
    </div>
  );
}

export function ShopPageClient({
  initialData,
  categories,
  brands = [],
}: {
  initialData?: ProductsResponse;
  categories: CategoryItem[];
  brands?: string[];
}) {
  const sp = useSearchParams();
  const filters = useMemo(() => buildShopFilters(sp), [sp]);

  // The controls state lives here (not inside ShopControls) so the desktop
  // filter rail and the toolbar share exactly one instance of it. Two
  // instances would both write to the URL and could clobber each other's
  // search/sort values.
  const recents = useRecentSearches();
  const controls = useShopControls((term) => {
    if (term.trim().length >= 2) recents.addSearch(term);
  });

  const { data, isFetching, isFetchingNextPage, hasNextPage, fetchNextPage } =
    useShopInfiniteQuery(filters, initialData);

  // Dedupe across appended infinite-scroll pages. Order comes from the server
  // (see `soldOutLast` in getProductListByFilters) — available first, sold-out
  // after. Re-partitioning here would re-shuffle the list on every page append,
  // which is the bug this replaced.
  const products = useMemo(() => {
    const seen = new Set<string>();
    const unique: ShopProduct[] = [];
    for (const page of data?.pages ?? []) {
      for (const p of page.products as ShopProduct[]) {
        if (!seen.has(p.id)) {
          seen.add(p.id);
          unique.push(p);
        }
      }
    }
    return unique;
  }, [data]);

  const total = data?.pages[0]?.total ?? initialData?.total ?? 0;

  const isRefreshing = isFetching && !isFetchingNextPage;
  const isInitialLoading = !data && isFetching;

  const listName = useMemo(() => {
    if (filters.search) return `search:${filters.search}`;
    if (filters.category) return `category:${filters.category}`;
    return "shop";
  }, [filters]);

  useEffect(() => {
    if (products.length === 0) return;
    trackViewItemList(
      products.map((p) => toGAProduct(p)),
      listName
    );
  }, [products, listName]);

  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (observerRef.current) observerRef.current.disconnect();
      if (!node || !hasNextPage || isFetchingNextPage) return;
      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0]?.isIntersecting) fetchNextPage();
        },
        { rootMargin: "200px" }
      );
      observerRef.current.observe(node);
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage]
  );

  return (
    <div className="lg:grid lg:grid-cols-[260px_minmax(0,1fr)] lg:items-start lg:gap-8">
      <aside
        aria-label="Bộ lọc sản phẩm"
        className="hide-scrollbar hidden lg:sticky lg:top-24 lg:block lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto"
      >
        <ShopFilterPanel
          categories={categories}
          brands={brands}
          initialState={controls.filterState}
          onApply={controls.handleApplyFilter}
          onClear={controls.handleClearFilters}
        />
      </aside>

      <div className="min-w-0">
        <ShopControls
          total={total}
          categories={categories}
          brands={brands}
          isTotalLoading={isInitialLoading}
          isSearching={isRefreshing}
          controls={controls}
          recents={recents}
        />

        <div
          className={`transition-all duration-300 ${
            isRefreshing ? "opacity-60 blur-sm" : ""
          }`}
        >
          {isInitialLoading ? (
            <ProductGridSkeleton />
          ) : products.length === 0 && !isFetching ? (
            <EmptyProductState
              search={filters.search}
              hasFilters={Boolean(filters.search) || controls.filterApplied}
              onClearFilters={controls.handleClearAll}
            />
          ) : (
            <ProductGrid products={products} />
          )}
        </div>

        <RecentlyViewedRail />

        {/* <InfiniteScrollSentinel
          hasNextPage={hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          sentinelRef={sentinelRef}
        /> */}
      </div>
    </div>
  );
}
