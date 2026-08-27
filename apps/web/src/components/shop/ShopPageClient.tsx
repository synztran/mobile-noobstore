"use client";

import { AnimatePresence, motion } from "motion/react";
import {
  ProductCard,
  ProductCardSkeleton,
} from "@/components/product/ProductCard";
import { ShopControls } from "@/components/shop/ShopControls";
import { RecentlyViewedRail } from "@/components/recently-viewed/RecentlyViewedRail";
import type { CategoryItem } from "@/lib/products-server";
import {
  buildShopFilters,
  useShopInfiniteQuery,
} from "@/lib/react-query/shop/api/useShopInfiniteQuery";
import type { ProductsResponse, ShopProduct } from "@/app/api/products/route";
import { trackViewItemList, toGAProduct } from "@/lib/analytics";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "next/navigation";

function ProductGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4">
      {Array.from({ length: 8 }, (_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

function EmptyProductState({ search }: { search?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-container">
        <svg className="h-8 w-8 text-outline-variant" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
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
    </div>
  );
}

function ProductGrid({ products }: { products: ShopProduct[] }) {
  return (
    <div className="grid grid-cols-2 gap-4">
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
            <ProductCard
              product={product}
              imagePriority={index < 2}
            />
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
  return (
    <div ref={sentinelRef} className="flex justify-center py-6">
      {isFetchingNextPage ? (
        <span className="loading loading-spinner loading-sm text-primary" />
      ) : hasNextPage ? (
        <div className="h-4" />
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

  const { data, isFetching, isFetchingNextPage, hasNextPage, fetchNextPage } =
    useShopInfiniteQuery(filters, initialData);

  const products = useMemo(() => {
    const all = data?.pages.flatMap((p) => p.products as ShopProduct[]) ?? [];
    const seen = new Set<string>();
    const unique: ShopProduct[] = [];
    for (const p of all) {
      if (!seen.has(p.id)) {
        seen.add(p.id);
        unique.push(p);
      }
    }
    const inStock = unique.filter((p) => p.stock_quantity > 0);
    const soldOut = unique.filter((p) => p.stock_quantity === 0);
    return [...inStock, ...soldOut];
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
    <>
      <ShopControls
        total={total}
        categories={categories}
        brands={brands}
        isTotalLoading={isInitialLoading}
        isSearching={isRefreshing}
      />

      <div
        className={`transition-all duration-300 ${
          isRefreshing ? "opacity-60 blur-sm" : ""
        }`}
      >
        {isInitialLoading ? (
          <ProductGridSkeleton />
        ) : products.length === 0 && !isFetching ? (
          <EmptyProductState search={filters.search} />
        ) : (
          <ProductGrid products={products} />
        )}
      </div>

      <RecentlyViewedRail />

      <InfiniteScrollSentinel
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        sentinelRef={sentinelRef}
      />
    </>
  );
}
