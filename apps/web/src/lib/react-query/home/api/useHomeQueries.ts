import { apiFetch } from "@/lib/api/fetch";
import type { CommunityPhoto } from "@/app/api/home/community-gallery/route";
import type { Creator } from "@/app/api/home/creators/route";
import type { HeroCampaign } from "@/app/api/home/hero/route";
import type { HomeTestimonialsResponse } from "@/app/api/home/testimonials/route";
import type { TrustProp } from "@/app/api/home/trust-props/route";
import type { ShopProduct } from "@/modules/products/types";
import { appQueryKeys } from "@/lib/react-query/root";

import { useMutation, useQuery } from "@tanstack/react-query";

export function useHomeHero({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery<HeroCampaign[]>({
    ...appQueryKeys.home.hero,
    enabled,
    queryFn: async ({ signal }) => {
      const res = await apiFetch("/api/home/hero", { signal });
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
    staleTime: Infinity,
    gcTime: Infinity,
  });
}

export function useHomeCommunityGallery(limit: number) {
  return useQuery<{ photos: CommunityPhoto[]; hasMore: boolean }>({
    ...appQueryKeys.home.communityGallery(limit),
    staleTime: Infinity,
    gcTime: Infinity,
    queryFn: async ({ signal }) => {
      const res = await apiFetch(`/api/home/community-gallery?limit=${limit + 1}`, { signal });
      if (!res.ok) return { photos: [], hasMore: false };
      const raw = await res.json();
      const all: CommunityPhoto[] = Array.isArray(raw) ? raw : [];
      return {
        photos: all.slice(0, limit),
        hasMore: all.length > limit,
      };
    },
    placeholderData: (prev) => prev,
  });
}

export function useHomeNoteworthy(categorySlug: string) {
  return useQuery<ShopProduct[]>({
    ...appQueryKeys.home.noteworthy(categorySlug),
    staleTime: 120_000,
    queryFn: async ({ signal }) => {
      const query = new URLSearchParams({ limit: "5" });
      if (categorySlug) query.set("category", categorySlug);
      const res = await apiFetch(`/api/products/noteworthy?${query.toString()}`, { signal });
      if (!res.ok) throw new Error("Failed to fetch noteworthy products");
      const data = (await res.json()) as { products?: ShopProduct[] };
      return data.products ?? [];
    },
  });
}

export function useHomeSaleProducts(
  categorySlug: string,
  limit: number,
  sort: string
) {
  return useQuery<{ products: ShopProduct[]; total: number }>({
    ...appQueryKeys.home.saleProducts(categorySlug, limit, sort),
    staleTime: 120_000,
    queryFn: async ({ signal }) => {
      const query = new URLSearchParams({ limit: String(limit), sort });
      if (categorySlug) query.set("category", categorySlug);
      const res = await apiFetch(`/api/products/sale?${query.toString()}`, { signal });
      if (!res.ok) throw new Error("Failed to fetch sale products");
      return res.json() as Promise<{ products: ShopProduct[]; total: number }>;
    },
    placeholderData: (prev) => prev,
  });
}

export function useHomeTrustProps() {
  return useQuery<TrustProp[]>({
    ...appQueryKeys.home.trustProps,
    staleTime: Infinity,
    gcTime: Infinity,
    queryFn: async ({ signal }) => {
      const res = await apiFetch("/api/home/trust-props", { signal });
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
  });
}

export function useHomeCreators() {
  return useQuery<Creator[]>({
    ...appQueryKeys.home.creators,
    staleTime: Infinity,
    gcTime: Infinity,
    queryFn: async ({ signal }) => {
      const res = await apiFetch("/api/home/creators", { signal });
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
  });
}

export function useHomeTestimonials() {
  return useQuery<HomeTestimonialsResponse>({
    ...appQueryKeys.home.testimonials,
    staleTime: Infinity,
    gcTime: Infinity,
    queryFn: async ({ signal }) => {
      const res = await apiFetch("/api/home/testimonials", { signal });
      if (!res.ok) {
        return { testimonials: [], summary: { count: 0, averageRating: null } };
      }
      const data = (await res.json()) as HomeTestimonialsResponse;
      return data && Array.isArray(data.testimonials)
        ? data
        : { testimonials: [], summary: { count: 0, averageRating: null } };
    },
  });
}

export function useNewsletterSubscribe() {
  return useMutation({
    mutationFn: async (email: string) => {
      const res = await apiFetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Đăng ký thất bại");
      return data;
    },
  });
}
