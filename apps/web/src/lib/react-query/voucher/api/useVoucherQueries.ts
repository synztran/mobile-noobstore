import { appQueryKeys } from "@/lib/react-query/root";
import type { VoucherRow } from "@/types/voucher";
import { useQuery } from "@tanstack/react-query";

export function useVoucherList() {
  return useQuery<VoucherRow[]>({
    ...appQueryKeys.voucher.list,
    staleTime: 60_000,
    queryFn: async () => {
      const res = await fetch("/api/vouchers", {
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