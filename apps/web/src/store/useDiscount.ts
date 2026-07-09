import { toast } from "@/lib/toast";
import type {
  AppliedVoucherEntry,
  AppliedVoucherSummary,
  ApplyVoucherResponse,
  VoucherGiftItem,
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
  appliedVouchers: AppliedVoucherEntry[];
  totalDiscountAmount: number;
  totalShippingDiscountAmount: number;
  totalGiftItems: VoucherGiftItem[];
  loadingVouchers: boolean;
  applyingVoucher: boolean;
  error: string | null;
  setVouchers: (vouchers: VoucherRow[]) => void;
  fetchVouchers: () => Promise<void>;
  applyVouchers: (
    voucherIds: string[],
    subtotal?: number,
    shippingCost?: number
  ) => Promise<void>;
  removeAppliedVoucher: (voucherId: string) => void;
  removeAllVouchers: () => void;
  resetDiscount: () => void;
};

const INITIAL_STATE = {
  vouchers: [],
  appliedVouchers: [],
  totalDiscountAmount: 0,
  totalShippingDiscountAmount: 0,
  totalGiftItems: [],
  loadingVouchers: false,
  applyingVoucher: false,
  error: null,
};

export const useDiscountStore = create<DiscountStore>()(
  persist(
    (set, get) => ({
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

      applyVouchers: async (voucherIds, subtotal = 0, shippingCost = 0) => {
        if (voucherIds.length === 0) {
          get().removeAllVouchers();
          return;
        }

        set({ applyingVoucher: true, error: null });
        try {
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

          const data = (await res.json()) as ApplyVoucherResponse;
          set({
            appliedVouchers: data.vouchers,
            totalDiscountAmount: data.totalDiscountAmount,
            totalShippingDiscountAmount: data.totalShippingDiscountAmount,
            totalGiftItems: data.totalGifts,
            applyingVoucher: false,
          });
          toast.success("Áp dụng voucher thành công");
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Failed to apply voucher";
          set({
            error: message,
            applyingVoucher: false,
          });
          toast.error(message);
        }
      },

      removeAppliedVoucher: (voucherId) => {
        const state = get();
        const remaining = state.appliedVouchers.filter(
          (v) => v.voucherInfo.voucher_id !== voucherId
        );

        if (remaining.length === 0) {
          get().removeAllVouchers();
          toast.success("Đã loại bỏ voucher");
          return;
        }

        set({
          appliedVouchers: remaining,
          totalDiscountAmount: remaining.reduce(
            (sum, v) => sum + v.discountAmount,
            0
          ),
          totalShippingDiscountAmount: remaining.reduce(
            (sum, v) => sum + v.shippingDiscountAmount,
            0
          ),
          totalGiftItems: remaining.flatMap((v) => v.gifts),
          error: null,
        });
        toast.success("Đã loại bỏ voucher");
      },

      removeAllVouchers: () =>
        set({
          appliedVouchers: [],
          totalDiscountAmount: 0,
          totalShippingDiscountAmount: 0,
          totalGiftItems: [],
          error: null,
        }),

      resetDiscount: () => set({ ...INITIAL_STATE }),
    }),
    {
      name: "noobstore-discount",
      partialize: (state) => ({
        appliedVouchers: state.appliedVouchers,
      }),
      merge: (persisted, current) => {
        const merged = { ...current, ...(persisted as Partial<DiscountStore>) };

        // Migrate old single-voucher persisted state to new format
        const p = (persisted as Record<string, unknown>) ?? {};
        const oldAppliedVoucher = p.appliedVoucher;
        if (
          oldAppliedVoucher &&
          !(merged.appliedVouchers as AppliedVoucherEntry[] | undefined)
            ?.length
        ) {
          merged.appliedVouchers = [
            {
              voucherInfo: oldAppliedVoucher as AppliedVoucherSummary,
              discountAmount: (p.discountAmount as number) ?? 0,
              shippingDiscountAmount: (p.shippingDiscountAmount as number) ?? 0,
              gifts: (p.giftItems as VoucherGiftItem[]) ?? [],
            },
          ];
        }

        return merged;
      },
    }
  )
);
