import { createQueryKeys } from "@lukemorales/query-key-factory";

export const reviewQueryKeys = createQueryKeys("review", {
  list: (productSlug: string) => [productSlug],
});
