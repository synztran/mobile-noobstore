import type { ProductsResponse } from "@/app/api/products/route";
import { appQueryKeys } from "@/lib/react-query/root";
import { keepPreviousData, useInfiniteQuery } from "@tanstack/react-query";

const PAGE_SIZE = 12;

export interface Filters {
  search?: string;
  category?: string;
  sort?: string;
  priceMin?: string;
  priceMax?: string;
}

export function buildShopFilters(sp: URLSearchParams): Filters {
  return {
    search: sp.get("search") ?? "",
    category: sp.get("category") ?? "",
    sort: sp.get("sort") ?? "newest",
    priceMin: sp.get("priceMin") ?? "",
    priceMax: sp.get("priceMax") ?? "",
  };
}

export function buildShopUrl(offset: number, filters: Filters): string {
  const params = new URLSearchParams();
  params.set("offset", String(offset));
  params.set("limit", String(PAGE_SIZE));
  if (filters.search) params.set("search", filters.search);
  if (filters.category) params.set("category", filters.category);
  if (filters.sort && filters.sort !== "newest") params.set("sort", filters.sort);
  if (filters.priceMin) params.set("priceMin", filters.priceMin);
  if (filters.priceMax) params.set("priceMax", filters.priceMax);
  return `/api/products?${params.toString()}`;
}

function filtersToKey(f: Filters): string {
  return `${f.search ?? ""}|${f.category ?? ""}|${f.sort ?? ""}|${f.priceMin ?? ""}|${f.priceMax ?? ""}`;
}

export function useShopInfiniteQuery(
  filters: Filters,
  initialData?: ProductsResponse
) {
  return useInfiniteQuery<ProductsResponse>({
    queryKey: appQueryKeys.shop.products(filtersToKey(filters)).queryKey,
    placeholderData: keepPreviousData,
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
    ...(initialData
      ? { initialData: { pages: [initialData], pageParams: [0] } }
      : {}),
  });
}
