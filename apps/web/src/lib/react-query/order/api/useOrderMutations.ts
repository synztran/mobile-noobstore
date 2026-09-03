import { appQueryKeys } from "@/lib/react-query/root";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useCancelOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      orderId,
      reason,
    }: {
      orderId: string;
      reason: string;
    }) => {
      const res = await fetch(`/api/orders/${orderId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Không thể hủy đơn hàng");
      return data;
    },
    onSuccess: (_data, { orderId }) => {
      queryClient.invalidateQueries({
        queryKey: appQueryKeys.order.detail(orderId).queryKey,
      });
      queryClient.invalidateQueries({ queryKey: ["orders", "list"] });
      queryClient.invalidateQueries({ queryKey: ["order", "byNumber"] });
    },
  });
}

export function useReturnOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      orderId,
      reason,
    }: {
      orderId: string;
      reason: string;
    }) => {
      const res = await fetch(`/api/orders/${orderId}/return`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Không thể gửi yêu cầu hoàn hàng");
      return data;
    },
    onSuccess: (_data, { orderId }) => {
      queryClient.invalidateQueries({
        queryKey: appQueryKeys.order.detail(orderId).queryKey,
      });
      queryClient.invalidateQueries({ queryKey: ["orders", "list"] });
      queryClient.invalidateQueries({ queryKey: ["order", "byNumber"] });
    },
  });
}
