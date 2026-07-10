import { appQueryKeys } from "@/lib/react-query/root";
import { toast } from "@/lib/toast";
import { useDiscountStore } from "@/store/useDiscount";
import type { ApplyVoucherResponse } from "@/types/voucher";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useApplyVouchers() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      voucherIds,
      subtotal = 0,
      shippingCost = 0,
    }: {
      voucherIds: string[];
      subtotal?: number;
      shippingCost?: number;
    }) => {
      if (voucherIds.length === 0) {
        useDiscountStore.getState().removeAllVouchers();
        return null;
      }

      const res = await fetch("/api/vouchers/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          voucherIds: [...new Set(voucherIds)],
          subtotal,
          shippingCost,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error);
      }

      return res.json() as Promise<ApplyVoucherResponse>;
    },
    onSuccess: (data) => {
      if (!data) return;
      useDiscountStore.getState().setAppliedVouchers(
        data.vouchers,
        data.totalDiscountAmount,
        data.totalShippingDiscountAmount,
        data.totalGifts,
      );
      queryClient.invalidateQueries({ queryKey: appQueryKeys.voucher.list.queryKey });
      toast.success("Áp dụng voucher thành công");
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to apply voucher",
      );
    },
  });
}

/**
 * Removes a single voucher from the applied list.
 * The store action already triggers a toast.
 */
export function useRemoveVoucher() {
  return useMutation({
    mutationFn: async (voucherId: string) => {
      useDiscountStore.getState().removeAppliedVoucher(voucherId);
    },
  });
}