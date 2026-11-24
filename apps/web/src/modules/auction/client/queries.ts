"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/fetch";
import { auctionQueryKeys } from "./query-keys";
import type {
  AuctionDetailResponse,
  AuctionProductItem,
  BuyNowResponse,
  PlaceBidResponse,
  UserBidHistoryItem,
} from "../types";

export function useAuctionsQuery(filters?: { status?: string; isFeatured?: boolean }) {
  return useQuery({
    queryKey: auctionQueryKeys.list(filters).queryKey,
    queryFn: async () => {
      const sp = new URLSearchParams();
      if (filters?.status) sp.set("status", filters.status);
      if (filters?.isFeatured !== undefined) sp.set("featured", String(filters.isFeatured));

      const res = await apiFetch(`/api/auctions?${sp.toString()}`);
      if (!res.ok) throw new Error("Failed to load auctions");
      const data = await res.json();
      return (data.auctions ?? []) as AuctionProductItem[];
    },
    staleTime: 10_000,
  });
}

export function useAuctionDetailQuery(
  id: string,
  initialData?: AuctionDetailResponse
) {
  return useQuery({
    queryKey: auctionQueryKeys.detail(id).queryKey,
    queryFn: async () => {
      const res = await apiFetch(`/api/auctions/${id}`);
      if (!res.ok) throw new Error("Failed to load auction detail");
      return (await res.json()) as AuctionDetailResponse;
    },
    initialData,
    staleTime: 5_000,
  });
}

export function useUserAuctionHistoryQuery() {
  return useQuery({
    queryKey: auctionQueryKeys.userHistory.queryKey,
    queryFn: async () => {
      const res = await apiFetch("/api/auctions/user/history");
      if (!res.ok) throw new Error("Failed to load auction history");
      const data = await res.json();
      return (data.history ?? []) as UserBidHistoryItem[];
    },
    staleTime: 15_000,
  });
}

export function usePlaceBidMutation(auctionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (amount: number): Promise<PlaceBidResponse> => {
      const res = await apiFetch(`/api/auctions/${auctionId}/bid`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Không thể đặt giá");
      }
      return data;
    },
    onSuccess: (result) => {
      if (result.amount !== undefined) {
        queryClient.setQueryData<AuctionDetailResponse>(
          auctionQueryKeys.detail(auctionId).queryKey,
          (current) => {
            if (!current) return current;
            return {
              ...current,
              auction: {
                ...current.auction,
                current_price: result.amount!,
                ends_at: result.ends_at ?? current.auction.ends_at,
                status: result.status ?? current.auction.status,
              },
              eligibility: current.eligibility
                ? {
                    ...current.eligibility,
                    can_bid: false,
                    code: "already_highest_bidder",
                    message: "Bạn đang là người trả giá cao nhất",
                    is_winning: true,
                  }
                : current.eligibility,
            };
          }
        );
      }
      void queryClient.invalidateQueries({
        queryKey: auctionQueryKeys.detail(auctionId).queryKey,
        refetchType: "inactive",
      });
      void queryClient.invalidateQueries({
        queryKey: auctionQueryKeys.list().queryKey,
      });
      void queryClient.invalidateQueries({
        queryKey: auctionQueryKeys.userHistory.queryKey,
      });
    },
  });
}

export function useBuyNowMutation(auctionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<BuyNowResponse> => {
      const res = await apiFetch(`/api/auctions/${auctionId}/buy-now`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Không thể mua ngay");
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: auctionQueryKeys.detail(auctionId).queryKey,
      });
      queryClient.invalidateQueries({
        queryKey: auctionQueryKeys.list().queryKey,
      });
      queryClient.invalidateQueries({
        queryKey: auctionQueryKeys.userHistory.queryKey,
      });
    },
  });
}

export function useAuctionCheckoutMutation(auctionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      deliveryAddress: {
        fullName: string;
        phoneNumber: string;
        address: string;
        city: string;
        district: string;
        ward: string;
      };
      paymentType?: "bank_transfer" | "cod";
      shippingFee?: number;
    }) => {
      const res = await apiFetch(`/api/auctions/${auctionId}/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Không thể thanh toán đấu giá");
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: auctionQueryKeys.detail(auctionId).queryKey,
      });
      queryClient.invalidateQueries({
        queryKey: auctionQueryKeys.userHistory.queryKey,
      });
    },
  });
}
