"use client";

import { ProductCard, ProductCardSkeleton } from "@/components/product/ProductCard";
import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Search, X } from "lucide-react";
import type { ProductsResponse, ShopProduct } from "@/app/api/products/route";
import type { SortOption } from "@/app/api/products/route";
import { buildShopUrl } from "@/lib/react-query/shop/api/useShopInfiniteQuery";
import { useInfiniteQuery } from "@tanstack/react-query";
import { appQueryKeys } from "@/lib/react-query/root";

interface Props {
  initialData: ProductsResponse | null;
  query: string;
  initialSort: SortOption;
}

export function SearchPageClient({ initialData, query, initialSort }: Props) {
  const router = useRouter();
  const [searchText, setSearchText] = useState(query);
  const [sort, setSort] = useState<SortOption>(initialSort || "newest");

  useEffect(() => {
    setSearchText(query);
  }, [query]);

  const filters = useMemo(
    () => ({
      search: query,
      sort,
      category: "",
      priceMin: "",
      priceMax: "",
    }),
    [query, sort]
  );

  const {
    data,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    isLoading,
  } = useInfiniteQuery<ProductsResponse>({
    queryKey: appQueryKeys.shop.products(`search:${query}|${sort}`).queryKey,
    queryFn: async ({ pageParam }) => {
      const res = await fetch(buildShopUrl(pageParam as number, filters));
      if (!res.ok) throw new Error("Failed to fetch products");
      return res.json();
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) => {
      const loaded = pages.reduce((sum, p) => sum + p.products.length, 0);
      return loaded < lastPage.total ? loaded : undefined;
    },
    initialData: initialData
      ? { pages: [initialData], pageParams: [0] }
      : undefined,
    enabled: !!query,
  });

  const products = useMemo(() => {
    if (!data?.pages) return [];
    const all = data.pages.flatMap((p) => p.products as ShopProduct[]);
    const inStock = all.filter((p) => p.stock_quantity > 0);
    const soldOut = all.filter((p) => p.stock_quantity === 0);
    return [...inStock, ...soldOut];
  }, [data]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchText.trim();
    if (trimmed) {
      router.push(`/search?q=${encodeURIComponent(trimmed)}`);
    }
  };

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
    <div className="space-y-6">
      <form onSubmit={handleSearch} className="relative">
        <Search
          size={18}
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/50"
        />
        <input
          type="text"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          placeholder="Tìm kiếm sản phẩm..."
          className="w-full rounded-2xl border border-outline-variant/30 bg-surface-container-low py-3 pl-12 pr-10 text-sm text-on-surface outline-none transition-all placeholder:text-on-surface-variant/40 focus:border-primary focus:ring-1 focus:ring-primary"
        />
        {searchText && (
          <button
            type="button"
            onClick={() => router.push("/search")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50 hover:text-on-surface"
          >
            <X size={18} />
          </button>
        )}
      </form>

      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-on-surface-variant">
          {isLoading
            ? "Đang tìm kiếm..."
            : data?.pages?.[0]
              ? `${data.pages[0].total} kết quả`
              : ""}
        </p>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortOption)}
          className="rounded-xl border border-outline-variant/30 bg-surface-container-low px-3 py-1.5 text-xs font-semibold text-on-surface outline-none"
        >
          <option value="newest">Mới nhất</option>
          <option value="price_asc">Giá: Thấp→Cao</option>
          <option value="price_desc">Giá: Cao→Thấp</option>
        </select>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="rounded-2xl border border-outline-variant/20 bg-surface-container-low p-8 text-center">
          <Search size={32} className="mx-auto mb-3 text-on-surface-variant/30" />
          <p className="font-semibold text-on-surface-variant">
            {query
              ? "Không tìm thấy sản phẩm phù hợp"
              : "Nhập từ khóa để tìm kiếm"}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
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
      )}
    </div>
  );
}
