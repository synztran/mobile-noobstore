"use client";

import { AnimatePresence, motion } from "motion/react";
import { ProductCard } from "@/components/product/ProductCard";
import { ShopControls } from "@/components/shop/ShopControls";
import type { CategoryItem } from "@/lib/products-server";
import {
  buildShopFilters,
  useShopInfiniteQuery,
} from "@/lib/react-query/shop/api/useShopInfiniteQuery";
import type { ProductsResponse, ShopProduct } from "@/app/api/products/route";
import { useCallback, useMemo, useRef } from "react";
import { useSearchParams } from "next/navigation";

export function ShopPageClient({
  initialData,
  categories,
}: {
  initialData: ProductsResponse;
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

  const total = data?.pages[0]?.total ?? initialData.total;

  // Loading bar when fetching new filter/sort results
  const isRefreshing = isFetching && !isFetchingNextPage;

  // ── Infinite scroll sentinel ──
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
      {/* Top loading bar */}
      <div className="relative h-0.5">
        <div
          className={`absolute inset-0 bg-primary transition-opacity duration-300 ${
            isRefreshing ? "animate-pulse opacity-100" : "opacity-0"
          }`}
        />
      </div>

      <ShopControls total={total} categories={categories} />

      {products.length === 0 && !isFetching ? (
        <div className="flex items-center justify-center gap-4 py-16 text-center">
          <p className="font-semibold text-on-surface-variant">
            Không tìm thấy sản phẩm phù hợp
          </p>
        </div>
      ) : (
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
      )}

      {/* Infinite scroll sentinel */}
      <div ref={sentinelRef} className="flex justify-center py-6">
        {isFetchingNextPage ? (
          <span className="loading loading-spinner loading-sm text-primary" />
        ) : hasNextPage ? (
          <div className="h-4" />
        ) : null}
      </div>
    </>
  );
}
