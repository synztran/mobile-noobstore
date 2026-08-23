import { useQuery } from "@tanstack/react-query";

export interface ShippingEstimate {
  id: string;
  name: string;
  description: string | null;
  estimated_hours_min: number | null;
  estimated_hours_max: number | null;
  estimated_date_min: string;
  estimated_date_max: string;
}

export interface ShippingEstimateResponse {
  district: string | null;
  city: string | null;
  estimates: ShippingEstimate[];
}

export function useShippingEstimate(enabled = true) {
  return useQuery<ShippingEstimateResponse>({
    queryKey: ["shipping", "estimate"],
    enabled,
    staleTime: 300_000,
    queryFn: async () => {
      const res = await fetch("/api/shipping/estimate");
      if (!res.ok) return { district: null, city: null, estimates: [] };
      return res.json();
    },
  });
}
