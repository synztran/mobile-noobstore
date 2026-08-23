import type { RewardClaim, RedeemResponse } from "@/types/reward";
import { appQueryKeys } from "@/lib/react-query/root";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface ClaimsResponse {
  claims: RewardClaim[];
}

export function useClaims(enabled = true) {
  return useQuery<ClaimsResponse>({
    queryKey: ["claims"],
    enabled,
    staleTime: 60_000,
    queryFn: async () => {
      const res = await fetch("/api/claims");
      if (!res.ok) return { claims: [] };
      return res.json();
    },
  });
}

export function useClaimReward() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (rewardItemId: string) => {
      const res = await fetch("/api/claims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reward_id: rewardItemId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Đổi thưởng thất bại");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["claims"] });
      queryClient.invalidateQueries({ queryKey: ["points"] });
    },
  });
}

export function useRewardsInfinite(category: string, limit = 10) {
  return useQuery({
    queryKey: ["rewards", "infinite", category, limit],
    staleTime: 60_000,
    queryFn: async () => {
      const params = new URLSearchParams({ limit: String(limit) });
      if (category) params.set("category", category);
      const res = await fetch(`/api/rewards?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch rewards");
      return res.json();
    },
  });
}

export function useRedeemReward() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (rewardItemId: string) => {
      const res = await fetch("/api/rewards/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rewardItemId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Đổi thưởng thất bại");
      return data as RedeemResponse;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rewards", "infinite"] });
      queryClient.invalidateQueries({ queryKey: ["points"] });
      queryClient.invalidateQueries({ queryKey: ["claims"] });
    },
  });
}
