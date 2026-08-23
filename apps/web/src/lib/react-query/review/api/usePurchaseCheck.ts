import { useQuery } from "@tanstack/react-query";

export interface PurchasedItem {
  product_name: string;
  thumbnail: string | null;
  variant_summary: string;
}

export interface PurchaseCheckResponse {
  can_review: boolean;
  has_reviewed: boolean;
  purchased_items: PurchasedItem[];
}

export function usePurchaseCheck(productSlug: string, enabled: boolean) {
  return useQuery<PurchaseCheckResponse>({
    queryKey: ["purchase-check", productSlug],
    queryFn: async () => {
      const res = await fetch(
        `/api/products/${productSlug}/reviews/purchase-check`
      );
      if (!res.ok)
        return { can_review: false, has_reviewed: false, purchased_items: [] };
      return res.json();
    },
    enabled,
    staleTime: 60_000,
  });
}
