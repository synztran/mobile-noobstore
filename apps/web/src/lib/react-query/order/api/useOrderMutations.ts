import { appQueryKeys } from "@/lib/react-query/root";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export class PickupCodeError extends Error {
  readonly cooldownSecondsLeft?: number;
  readonly lockSecondsLeft?: number;

  constructor(
    message: string,
    extra?: { cooldownSecondsLeft?: number; lockSecondsLeft?: number }
  ) {
    super(message);
    this.name = "PickupCodeError";
    this.cooldownSecondsLeft = extra?.cooldownSecondsLeft;
    this.lockSecondsLeft = extra?.lockSecondsLeft;
  }
}

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

export function usePickupCode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      orderId,
      email = false,
      code,
    }: {
      orderId: string;
      email?: boolean;
      code?: string;
    }) => {
      const res = await fetch(`/api/orders/${orderId}/pickup-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          email ? { email: true, ...(code ? { code } : {}) } : {}
        ),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new PickupCodeError(data.error ?? "Không thể tạo mã nhận hàng", {
          cooldownSecondsLeft:
            typeof data.cooldownSecondsLeft === "number"
              ? data.cooldownSecondsLeft
              : undefined,
          lockSecondsLeft:
            typeof data.lockSecondsLeft === "number"
              ? data.lockSecondsLeft
              : undefined,
        });
      }
      return data as {
        ok: boolean;
        code: string | null;
        expiresAt: string;
      };
    },
    onSuccess: (_data, { orderId }) => {
      queryClient.invalidateQueries({
        queryKey: appQueryKeys.order.detail(orderId).queryKey,
      });
    },
  });
}
