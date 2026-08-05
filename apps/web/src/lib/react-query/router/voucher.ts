import { createQueryKeys } from "@lukemorales/query-key-factory";

export const voucherQueryKeys = createQueryKeys("voucher", {
  list: null,
  eligible: (productIds: string) => [productIds],
  fees: null,
  apply: null,
});