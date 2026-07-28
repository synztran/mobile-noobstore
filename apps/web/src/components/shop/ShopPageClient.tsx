"use client";

import { AnimatePresence, motion } from "motion/react";
import { ProductCard, ProductCardSkeleton } from "@/components/product/ProductCard";
import { ShopControls } from "@/components/shop/ShopControls";
import type { CategoryItem } from "@/lib/products-server";
import {
  buildShopFilters,
  useShopInfiniteQuery,
} from "@/lib/react-query/shop/api/useShopInfiniteQuery";
import type { ProductsResponse, ShopProduct } from "@/app/api/products/route";
import { useCallback, useMemo, useRef } from "react";
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
    <div className="flex items-center justify-center gap-4 py-16 text-center">
      <p className="font-semibold text-on-surface-variant">
        Không tìm thấy sản phẩm phù hợp
        {search ? (
          <>
            {" "}với từ khóa<span className="text-primary"> “{search}”</span>
          </>
        ) : null}
      </p>
    </div>
  );
}

function ProductGrid({ products }: { products: ShopProduct[] }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <AnimatePresence mode="popLayout">
        {products.map((product) => (
          <motion.div
            key={product.id}
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            <ProductCard product={product} />
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
}: {
  initialData?: ProductsResponse;
  categories: CategoryItem[];
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
      <ShopControls total={total} categories={categories} isTotalLoading={isInitialLoading} isSearching={isRefreshing} />

      <div
        className={`transition-all duration-300 ${
          isRefreshing ? "blur-sm opacity-60" : ""
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

      <InfiniteScrollSentinel
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        sentinelRef={sentinelRef}
      />
    </>
  );
}
