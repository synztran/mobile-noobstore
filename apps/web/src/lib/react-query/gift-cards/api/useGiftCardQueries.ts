import { apiFetch } from "@/lib/api/fetch";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";


export interface GiftCardCheckResponse {
  code: string;
  pointsValue: number;
}

export interface GiftCardRedeemResponse {
  giftCardId: number;
  pointsCredited: number;
  newBalance: number;
}

export function useGiftCardCheck(code: string, enabled = false) {
  return useQuery<GiftCardCheckResponse>({
    queryKey: ["gift-card-check", code],
    enabled,
    staleTime: 30_000,
    retry: false,
    queryFn: async () => {
      const res = await apiFetch(
        `/api/gift-cards/check?code=${encodeURIComponent(code)}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Kiểm tra thẻ thất bại");
      return data;
    },
  });
}

export function useGiftCardRedeem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (code: string) => {
      const res = await apiFetch("/api/gift-cards/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Nạp thẻ thất bại");
      return data as GiftCardRedeemResponse;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["points"] });
      queryClient.invalidateQueries({ queryKey: ["gift-card"] });
    },
  });
}
