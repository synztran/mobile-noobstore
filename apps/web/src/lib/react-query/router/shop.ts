import { createQueryKeys } from "@lukemorales/query-key-factory";

export const shopQueryKeys = createQueryKeys("shop", {
	products: (filterKey: string) => [filterKey],
});
