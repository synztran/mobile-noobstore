import { createQueryKeys } from "@lukemorales/query-key-factory";

export type PointTransaction = {
  id: number;
  delta: number;
  balance_after: number;
  source_type: string;
  source_ref: string | null;
  note: string | null;
  created_at: string;
};

export type HistoryResponse = {
  transactions: PointTransaction[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
};

export const pointsQueryKeys = createQueryKeys("points", {
  balance: null,
  history: (page: number) => [page],
});
