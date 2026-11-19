import { apiFetch } from "@/lib/api/fetch";
import type {
	ComponentVariantRule,
	ConfiguratorGroup,
	ProductSuggestion,
	ShopProduct,
} from "@/modules/products/types";
import { appQueryKeys } from "@/lib/react-query/root";

import { useQuery } from "@tanstack/react-query";

export interface QuickPickResponse {
	products: ShopProduct[];
	brandAlternatives?: ShopProduct[];
	configuratorByProductId: Record<string, ConfiguratorGroup[]>;
	rulesByProductId: Record<string, ComponentVariantRule[]>;
	activeProduct?: ShopProduct | null;
}

export function useQuickPick(
	requestKey: string,
	enabled: boolean,
	brand = "",
	excludeProductId = "",
	activeProductId = ""
) {
	return useQuery<QuickPickResponse>({
		...appQueryKeys.product.quickPick(requestKey, brand, excludeProductId, activeProductId),
		enabled: enabled && !requestKey.endsWith(":"),
		staleTime: 30_000,
		queryFn: async ({ signal }) => {
			const query = new URLSearchParams();
			if (brand) query.set("brand", brand);
			if (excludeProductId) query.set("excludeProductId", excludeProductId);
			if (activeProductId) query.set("productId", activeProductId);
			if (requestKey.startsWith("category:")) {
				const slug = requestKey.replace("category:", "");
				if (slug) query.set("categorySlug", slug);
			} else if (requestKey.startsWith("product:")) {
				const id = requestKey.replace("product:", "");
				if (id) query.set("productId", id);
			}
			const res = await apiFetch(
				`/api/products/quick-pick?${query.toString()}`,
				{ signal },
			);
			if (!res.ok) throw new Error("Failed to fetch quick pick data");
			return res.json() as Promise<QuickPickResponse>;
		},
	});
}

export function useProductSearch(q: string) {
	return useQuery<ProductSuggestion[]>({
		...appQueryKeys.product.search(q),
		enabled: q.length >= 2,
		staleTime: 30_000,
		queryFn: async ({ signal }) => {
			const res = await apiFetch(
				`/api/products/search?q=${encodeURIComponent(q)}&exclude_types=component`,
				{ signal },
			);
			if (!res.ok) throw new Error("Failed to search products");
			const data: ProductSuggestion[] = await res.json();
			return data.slice(0, 5);
		},
	});
}

export function useRecentlyViewedProducts(ids: string[]) {
	return useQuery<ShopProduct[]>({
		...appQueryKeys.product.recentlyViewed(ids.join(",")),
		enabled: ids.length > 0,
		staleTime: 60_000,
		queryFn: async ({ signal }) => {
			const res = await apiFetch(
				`/api/products?ids=${encodeURIComponent(ids.join(","))}`,
				{ signal },
			);
			if (!res.ok) throw new Error("Failed to fetch recently viewed products");
			const data: { products: ShopProduct[] } = await res.json();
			return data.products;
		},
	});
}
