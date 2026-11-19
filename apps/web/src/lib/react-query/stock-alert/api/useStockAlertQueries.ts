import { apiFetch } from "@/lib/api/fetch";
import { appQueryKeys } from "@/lib/react-query/root";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";


export function useStockAlertCheck(productId: string, variantId: string) {
  return useQuery<{ subscribed: boolean }>({
    queryKey: appQueryKeys["stock-alert"].check(productId, variantId)
      .queryKey,
    staleTime: 60_000,
    queryFn: async () => {
      const params = new URLSearchParams({ product_id: productId });
      if (variantId) params.set("variant_id", variantId);
      const res = await apiFetch(`/api/stock-alerts/check?${params.toString()}`);
      if (!res.ok) return { subscribed: false };
      return res.json();
    },
  });
}

export function useStockAlertList() {
  return useQuery<{
    subscriptions: Array<{
      id: string;
      product_id: string;
      variant_id: string | null;
      notified_at: string | null;
      created_at: string;
    }>;
  }>({
    queryKey: appQueryKeys["stock-alert"].list.queryKey,
    staleTime: 60_000,
    queryFn: async () => {
      const res = await apiFetch("/api/stock-alerts");
      if (!res.ok) return { subscriptions: [] };
      return res.json();
    },
  });
}

export function useStockAlertSubscribe() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      productId,
      variantId,
    }: {
      productId: string;
      variantId: string;
    }) => {
      const res = await apiFetch("/api/stock-alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id: productId,
          variant_id: variantId || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to subscribe");
      }
      return res.json();
    },
    onSuccess: (_data, { productId, variantId }) => {
      queryClient.invalidateQueries({
        queryKey: appQueryKeys["stock-alert"].check(productId, variantId)
          .queryKey,
      });
      queryClient.invalidateQueries({
        queryKey: appQueryKeys["stock-alert"].list.queryKey,
      });
    },
  });
}

export function useStockAlertUnsubscribe() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      productId,
      variantId,
    }: {
      productId: string;
      variantId: string;
    }) => {
      const res = await apiFetch("/api/stock-alerts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id: productId,
          variant_id: variantId || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to unsubscribe");
      }
      return res.json();
    },
    onSuccess: (_data, { productId, variantId }) => {
      queryClient.invalidateQueries({
        queryKey: appQueryKeys["stock-alert"].check(productId, variantId)
          .queryKey,
      });
      queryClient.invalidateQueries({
        queryKey: appQueryKeys["stock-alert"].list.queryKey,
      });
    },
  });
}
