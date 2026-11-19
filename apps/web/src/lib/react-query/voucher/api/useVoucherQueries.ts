import { apiFetch } from "@/lib/api/fetch";
import { queryPresets } from "@/lib/react-query/config";
import { appQueryKeys } from "@/lib/react-query/root";
import type { VoucherRow } from "@/types/voucher";
import { useQuery } from "@tanstack/react-query";


type EligibleResponse = {
  vouchers?: VoucherRow[];
  categorySlugByProductId?: Record<string, string>;
  ownedProductIds?: string[];
};

type FeesResponse = {
  maxVouchersPerOrder?: number;
};

export function useVoucherList(initialVouchers: VoucherRow[] = []) {
  return useQuery<VoucherRow[]>({
    ...appQueryKeys.voucher.list,
    staleTime: 60_000,
    placeholderData: initialVouchers,
    queryFn: async () => {
      const res = await apiFetch("/api/vouchers", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Failed to fetch vouchers");
      const data = (await res.json()) as {
        vouchers?: VoucherRow[];
        data?: VoucherRow[];
      };
      return data.vouchers ?? data.data ?? [];
    },
  });
}

export function useEligibleVouchers(
  productIds: string[],
  variantIds: string[],
  shippingMethodId?: string,
) {
  const key = [...productIds, ...variantIds].join(",");
  return useQuery<{
    vouchers: VoucherRow[];
    categorySlugByProductId: Record<string, string>;
    ownedProductIds: string[];
  }>({
    ...appQueryKeys.voucher.eligible(`${key}|${shippingMethodId ?? ""}`),
    ...queryPresets.temporary,
    enabled: productIds.length > 0,
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("product_ids", productIds.join(","));
      if (variantIds.length > 0) params.set("variant_ids", variantIds.join(","));
      if (shippingMethodId) params.set("shipping_method_id", shippingMethodId);
      const res = await apiFetch(
        `/api/vouchers/eligible?${params.toString()}`,
        { credentials: "include" },
      );
      if (!res.ok) throw new Error("Failed to fetch eligible vouchers");
      const data = (await res.json()) as EligibleResponse;
      return {
        vouchers: data.vouchers ?? [],
        categorySlugByProductId: data.categorySlugByProductId ?? {},
        ownedProductIds: data.ownedProductIds ?? productIds,
      };
    },
  });
}

export function useFeesConfig() {
  return useQuery<FeesResponse>({
    ...appQueryKeys.voucher.fees,
    ...queryPresets.temporary,
    queryFn: async () => {
      const res = await apiFetch("/api/fees", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch fees config");
      return (await res.json()) as FeesResponse;
    },
  });
}
