import { createQueryKeys } from "@lukemorales/query-key-factory";

/**
 * React-query key factories for the products domain.
 * Aggregated into `appQueryKeys` by src/lib/react-query/root.ts.
 */
export const productQueryKeys = createQueryKeys("product", {
	quickPick: (requestKey: string) => [requestKey],
	search: (q: string) => [q],
	recentlyViewed: (ids: string) => [ids],
});

export const shopQueryKeys = createQueryKeys("shop", {
	products: (filterKey: string) => [filterKey],
});
