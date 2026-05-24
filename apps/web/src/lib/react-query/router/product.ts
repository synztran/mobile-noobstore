import { createQueryKeys } from "@lukemorales/query-key-factory";

export const productQueryKeys = createQueryKeys("product", {
	quickPick: (requestKey: string) => [requestKey],
});
