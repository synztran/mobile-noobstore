import type { RankResponse } from "@/types/rank";
import { useQuery } from "@tanstack/react-query";

const myRankQueryKey = ["rank", "myRank"] as const;

export function useMyRank() {
  return useQuery<RankResponse>({
    queryKey: myRankQueryKey,
    staleTime: 0,
    refetchInterval: 30_000,
    retry: false,
    queryFn: async () => {
      const res = await fetch("/api/user/rank");
      if (res.status === 401) {
        return {
          currentRank: null,
          nextRank: null,
          progress: { totalSpent: 0, orderCount: 0, nextSpentThreshold: null, nextOrderThreshold: null },
          allRanks: [],
        } as RankResponse;
      }
      if (!res.ok) {
        const payload = await res.json().catch(() => null) as { error?: string } | null;
        throw new Error(payload?.error ?? "Failed to fetch rank");
      }
      return res.json() as Promise<RankResponse>;
    },
  });
}
