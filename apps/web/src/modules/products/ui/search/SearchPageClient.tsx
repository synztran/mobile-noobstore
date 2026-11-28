"use client";

import { apiFetch } from "@/lib/api/fetch";
import { ProductCard, ProductCardSkeleton } from "@/modules/products/ui/product/ProductCard";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Search, X } from "lucide-react";
import type {
  ProductsResponse,
  ShopProduct,
  SortOption,
} from "@/modules/products/types";
import { buildShopUrl } from "@/modules/products/client/shop-infinite";
import { trackSearch } from "@/lib/analytics";
import { useInfiniteQuery } from "@tanstack/react-query";
import { appQueryKeys } from "@/lib/react-query/root";

import { CATEGORIES } from "@/lib/data";

interface Props {
  initialData: ProductsResponse | null;
  query: string;
  initialSort: SortOption;
}

export function SearchPageClient({ initialData, query, initialSort }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchText, setSearchText] = useState(query);
  const [sort, setSort] = useState<SortOption>(initialSort || "newest");
  const [category, setCategory] = useState(searchParams.get("category") ?? "");

  useEffect(() => {
    setSearchText(query);
  }, [query]);

  const filters = useMemo(
    () => ({
      search: query,
      sort,
      category: category ? [category] : [],
      priceMin: "",
      priceMax: "",
    }),
    [query, sort, category]
  );

  const {
    data,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    isLoading,
  } = useInfiniteQuery<ProductsResponse>({
    queryKey: appQueryKeys.shop.products(`search:${query}|${sort}|${category}`).queryKey,
    queryFn: async ({ pageParam, signal }) => {
      const res = await apiFetch(buildShopUrl(pageParam as number, filters), { signal });
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

  // Order comes from the server (see `soldOutLast` in getProductListByFilters):
  // available first, sold-out after. Re-partitioning here would re-churn the
  // list every time an infinite-scroll page is appended.
  const products = useMemo(
    () => data?.pages.flatMap((p) => p.products as ShopProduct[]) ?? [],
    [data],
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchText.trim();
    if (trimmed) {
      trackSearch(trimmed);
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
            aria-label="Xoá tìm kiếm"
            onClick={() => router.push("/search")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50 hover:text-on-surface"
          >
            <X size={18} />
          </button>
        )}
      </form>

      {/* Category chips */}
      <div className="hide-scrollbar flex gap-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => {
            setCategory("");
            router.push(`/search?q=${encodeURIComponent(query)}`, { scroll: false });
          }}
          className={`shrink-0 rounded-full px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider transition-all ${
            !category
              ? "bg-primary text-on-primary"
              : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
          }`}
        >
          Tất cả
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => {
              setCategory(cat);
              router.push(`/search?q=${encodeURIComponent(query)}&category=${encodeURIComponent(cat)}`, { scroll: false });
            }}
            className={`shrink-0 rounded-full px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider transition-all ${
              category === cat
                ? "bg-primary text-on-primary"
                : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

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
