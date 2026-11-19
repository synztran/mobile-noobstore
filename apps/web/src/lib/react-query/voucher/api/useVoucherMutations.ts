import { apiFetch } from "@/lib/api/fetch";
import { appQueryKeys } from "@/lib/react-query/root";
import { trackVoucherApply } from "@/lib/analytics";
import { toast } from "@/lib/toast";
import { useDiscountStore } from "@/store/useDiscount";
import type { ApplyVoucherResponse, VoucherApplyItem } from "@/types/voucher";
import { useMutation, useQueryClient } from "@tanstack/react-query";


export function useApplyVouchers() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      voucherIds,
      subtotal = 0,
      shippingCost = 0,
      shippingMethodId,
      items,
    }: {
      voucherIds: string[];
      subtotal?: number;
      shippingCost?: number;
      shippingMethodId?: string;
      items?: VoucherApplyItem[];
      /**
       * Set for background recomputes of already-applied vouchers (the shopper
       * changed the cart, so the amounts must be re-priced). Those must not pop
       * an "applied" toast as if the shopper had just picked the voucher.
       */
      silent?: boolean;
    }) => {
      const maxVouchers = useDiscountStore.getState().maxVouchersPerOrder;
      const uniqueIds = [...new Set(voucherIds)];
      if (uniqueIds.length > maxVouchers) {
        toast.error(
          `Chỉ được áp dụng tối đa ${maxVouchers} mã giảm giá. Vui lòng gỡ bỏ một mã đã áp dụng rồi thử lại.`
        );
        return null;
      }

      if (voucherIds.length === 0) {
        useDiscountStore.getState().removeAllVouchers();
        return null;
      }

      const res = await apiFetch("/api/vouchers/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          voucherIds: uniqueIds,
          subtotal,
          shippingCost,
          shippingMethodId,
          items,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error);
      }

      return res.json() as Promise<ApplyVoucherResponse>;
    },
    onMutate: () => {
      useDiscountStore.setState({ applyingVoucher: true, error: null });
    },
    onSuccess: (data, variables) => {
      if (!data) return;
      useDiscountStore.getState().setAppliedVouchers(
        data.vouchers,
        data.totalDiscountAmount,
        data.totalShippingDiscountAmount,
        data.totalGifts,
      );
      queryClient.invalidateQueries({ queryKey: appQueryKeys.voucher.list.queryKey });
      if (variables.silent) return;
      trackVoucherApply(
        data.vouchers.map((v) => v.voucherInfo.voucher_code),
        data.totalDiscountAmount + data.totalShippingDiscountAmount
      );
      toast.success("Áp dụng voucher thành công");
    },
    onError: (error) => {
      useDiscountStore.setState({ applyingVoucher: false });
      toast.error(
        error instanceof Error ? error.message : "Failed to apply voucher",
      );
    },
    onSettled: () => {
      useDiscountStore.setState({ applyingVoucher: false });
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
