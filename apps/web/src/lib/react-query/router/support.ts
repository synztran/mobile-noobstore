import { createQueryKeys } from "@lukemorales/query-key-factory";

export interface SupportListFilters {
  page: number;
  limit: number;
  status?: string;
}

export const supportQueryKeys = createQueryKeys("support", {
  list: (filters: SupportListFilters) => [filters],
  detail: (id: string) => [id],
});
