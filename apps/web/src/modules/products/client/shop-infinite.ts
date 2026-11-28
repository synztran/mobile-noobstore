import { apiFetch } from "@/lib/api/fetch";
import type { ProductsResponse } from "@/modules/products/types";
import { appQueryKeys } from "@/lib/react-query/root";

import { keepPreviousData, useInfiniteQuery } from "@tanstack/react-query";

const PAGE_SIZE = 12;

export interface Filters {
  search?: string;
  category?: string | string[];
  brand?: string | string[];
  sort?: string;
  priceMin?: string;
  priceMax?: string;
}

export function buildShopFilters(sp: URLSearchParams): Filters {
  return {
    search: sp.get("search") ?? "",
    category: [...new Set(sp.getAll("category").filter(Boolean))],
    brand: [...new Set(sp.getAll("brand").filter(Boolean))],
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
  for (const category of (Array.isArray(filters.category) ? filters.category : filters.category ? [filters.category] : [])) params.append("category", category);
  for (const brand of (Array.isArray(filters.brand) ? filters.brand : filters.brand ? [filters.brand] : [])) params.append("brand", brand);
  if (filters.sort && filters.sort !== "newest") params.set("sort", filters.sort);
  if (filters.priceMin) params.set("priceMin", filters.priceMin);
  if (filters.priceMax) params.set("priceMax", filters.priceMax);
  return `/api/products?${params.toString()}`;
}

export function shopFiltersKey(f: Filters): string {
  const categories = [...new Set(Array.isArray(f.category) ? f.category : f.category ? [f.category] : [])].sort();
  const brands = [...new Set(Array.isArray(f.brand) ? f.brand : f.brand ? [f.brand] : [])].sort();
  return `${f.search ?? ""}|${categories.join(",")}|${brands.join(",")}|${f.sort ?? ""}|${f.priceMin ?? ""}|${f.priceMax ?? ""}`;
}

export function useShopInfiniteQuery(
  filters: Filters,
  initialData?: ProductsResponse
) {
  return useInfiniteQuery<ProductsResponse>({
    queryKey: appQueryKeys.shop.products(shopFiltersKey(filters)).queryKey,
    placeholderData: keepPreviousData,
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
    ...(initialData
      ? { initialData: { pages: [initialData], pageParams: [0] } }
      : {}),
  });
}
