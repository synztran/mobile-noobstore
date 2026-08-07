import { createQueryKeys } from "@lukemorales/query-key-factory";

export const productQueryKeys = createQueryKeys("product", {
	quickPick: (requestKey: string) => [requestKey],
	search: (q: string) => [q],
	recentlyViewed: (ids: string) => [ids],
});
