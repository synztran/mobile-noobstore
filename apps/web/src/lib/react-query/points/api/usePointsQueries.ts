import { appQueryKeys } from "@/lib/react-query/root";
import type { HistoryResponse } from "@/lib/react-query/router/points";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";

export function usePointsBalance() {
  return useQuery<number>({
    ...appQueryKeys.points.balance,
    queryFn: async () => {
      const res = await fetch("/api/points/balance");
      if (!res.ok) return 0;
      const data = await res.json();
      return data?.balance ?? 0;
    },
  });
}

export function usePointsHistory() {
  return useInfiniteQuery<HistoryResponse>({
    ...appQueryKeys.points.history(1),
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams({ page: String(pageParam) });
      const res = await fetch(`/api/points/history?${params}`);
      if (res.status === 401) throw new Error("UNAUTHORIZED");
      if (!res.ok) throw new Error("Không thể tải lịch sử điểm.");
      return res.json() as Promise<HistoryResponse>;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.page + 1 : undefined,
  });
}
