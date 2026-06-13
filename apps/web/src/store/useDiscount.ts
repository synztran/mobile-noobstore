import { toast } from "@/lib/toast";
import type {
  AppliedVoucherSummary,
  ApplyVoucherResponse,
  VoucherRow,
} from "@/types/voucher";
import { create } from "zustand";
import { persist } from "zustand/middleware";

type FetchVouchersResult = {
  vouchers?: VoucherRow[];
  data?: VoucherRow[];
};

type DiscountStore = {
  vouchers: VoucherRow[];
  appliedVoucher: AppliedVoucherSummary | null;
  discountAmount: number;
  shippingDiscountAmount: number;
  giftItems: Array<{
    product_id: string;
    variant_id: string | null;
    quantity: number;
  }>;
  loadingVouchers: boolean;
  applyingVoucher: boolean;
  error: string | null;
  setVouchers: (vouchers: VoucherRow[]) => void;
  fetchVouchers: () => Promise<void>;
  applyVoucher: (voucherId: string, subtotal?: number) => Promise<void>;
  removeVoucher: () => void;
  resetDiscount: () => void;
};

const INITIAL_STATE = {
  vouchers: [],
  appliedVoucher: null,
  discountAmount: 0,
  shippingDiscountAmount: 0,
  giftItems: [],
  loadingVouchers: false,
  applyingVoucher: false,
  error: null,
};

export const useDiscountStore = create<DiscountStore>()(
  persist(
    (set) => ({
      ...INITIAL_STATE,

      setVouchers: (vouchers) =>
        set({
          vouchers,
          error: null,
        }),

      fetchVouchers: async () => {
        set({ loadingVouchers: true, error: null });
        try {
          const res = await fetch("/api/vouchers", {
            method: "GET",
            headers: { "Content-Type": "application/json" },
          });

          if (!res.ok) {
            throw new Error("Failed to fetch vouchers");
          }

          const data = (await res.json()) as FetchVouchersResult;
          const vouchers = data.vouchers ?? data.data ?? [];
          set({
            vouchers,
            error: null,
            loadingVouchers: false,
          });
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Failed to fetch vouchers";
          set({
            error: message,
            loadingVouchers: false,
          });
          toast.error(message);
        }
      },

      applyVoucher: async (voucherId, subtotal = 0) => {
        set({ applyingVoucher: true, error: null });
        try {
          const res = await fetch("/api/vouchers/apply", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ voucherId, subtotal }),
          });

          if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.error);
          }

          const data = (await res.json()) as ApplyVoucherResponse;
          set({
            appliedVoucher: data.voucherInfo,
            discountAmount: data.discountAmount ?? 0,
            shippingDiscountAmount: data.shippingDiscountAmount ?? 0,
            giftItems: data.gifts ?? [],
            applyingVoucher: false,
          });
          // return true;
        } catch (error) {
          console.log(error);
          const message =
            error instanceof Error ? error.message : "Failed to apply voucher";
          set({
            error: message,
            applyingVoucher: false,
          });
          toast.error(message);
        }
      },

      removeVoucher: () =>
        set({
          appliedVoucher: null,
          discountAmount: 0,
          shippingDiscountAmount: 0,
          giftItems: [],
          error: null,
        }),

      resetDiscount: () => set({ ...INITIAL_STATE }),
    }),
    {
      name: "noobstore-discount",
      partialize: (state) => ({
        appliedVoucher: state.appliedVoucher,
        discountAmount: state.discountAmount,
        shippingDiscountAmount: state.shippingDiscountAmount,
        giftItems: state.giftItems,
      }),
    }
  )
);
