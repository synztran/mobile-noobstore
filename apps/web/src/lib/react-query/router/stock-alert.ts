import { createQueryKeys } from "@lukemorales/query-key-factory";

export const stockAlertQueryKeys = createQueryKeys("stock-alert", {
  check: (productId: string, variantId: string) => [productId, variantId],
  list: null,
});
