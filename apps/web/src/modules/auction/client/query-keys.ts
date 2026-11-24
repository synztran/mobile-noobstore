import { createQueryKeys } from "@lukemorales/query-key-factory";

export const auctionQueryKeys = createQueryKeys("auction", {
  list: (filters?: { status?: string; isFeatured?: boolean }) => [filters ?? {}],
  detail: (id: string) => [id],
  userHistory: null,
});
