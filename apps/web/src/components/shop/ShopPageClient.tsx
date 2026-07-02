"use client";

import { ProductCard, ProductCardSkeleton } from "@/components/product/ProductCard";
import { ShopControls } from "@/components/shop/ShopControls";
import type { CategoryItem } from "@/lib/products-server";
import {
  buildShopFilters,
  useShopInfiniteQuery,
  type Filters,
} from "@/lib/react-query/shop/api/useShopInfiniteQuery";
import type { ProductsResponse, ShopProduct } from "@/app/api/products/route";
import { useCallback, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

const PAGE_SIZE = 12;

export function ShopPageClient({
  initialData,
  categories,
}: {
  initialData: ProductsResponse;
  categories: CategoryItem[];
}) {
  const sp = useSearchParams();
  const [filters, setFilters] = useState<Filters>(() =>
    buildShopFilters(sp)
  );

  // Sync URL → filters on mount & manual URL changes
  useEffect(() => {
    setFilters(buildShopFilters(sp));
  }, [sp]);

  const { data, isFetchingNextPage, hasNextPage, fetchNextPage } =
    useShopInfiniteQuery(filters, initialData);

  const products =
    data?.pages.flatMap((p) => p.products as ShopProduct[]) ?? [];

  const total = data?.pages[0]?.total ?? initialData.total;

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
        { rootMargin: "400px" }
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
        filters={filters}
        onFiltersChange={setFilters}
      />

      {products.length === 0 ? (
        <div className="flex items-center justify-center gap-4 py-16 text-center">
          <p className="font-semibold text-on-surface-variant">
            Không tìm thấy sản phẩm phù hợp
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}

      {/* Infinite scroll sentinel */}
      {hasNextPage && (
        <div ref={sentinelRef} className="flex justify-center py-6">
          {isFetchingNextPage ? (
            <span className="loading loading-spinner loading-sm text-primary" />
          ) : (
            <div className="h-4" />
          )}
        </div>
      )}
    </>
  );
}
