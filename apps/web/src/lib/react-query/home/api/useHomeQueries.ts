import type { CommunityPhoto } from "@/app/api/home/community-gallery/route";
import type { Creator } from "@/app/api/home/creators/route";
import type { HeroCampaign } from "@/app/api/home/hero/route";
import type { Testimonial } from "@/app/api/home/testimonials/route";
import type { TrustProp } from "@/app/api/home/trust-props/route";
import type { ShopProduct } from "@/app/api/products/route";
import { appQueryKeys } from "@/lib/react-query/root";
import { useMutation, useQuery } from "@tanstack/react-query";

export function useHomeHero({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery<HeroCampaign[]>({
    ...appQueryKeys.home.hero,
    enabled,
    queryFn: async () => {
      const res = await fetch("/api/home/hero");
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
    staleTime: 120_000,
    queryFn: async () => {
      const res = await fetch(`/api/home/community-gallery?limit=${limit + 1}`);
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
    staleTime: 60_000,
    queryFn: async () => {
      const query = new URLSearchParams({ limit: "7" });
      if (categorySlug) query.set("category", categorySlug);
      const res = await fetch(`/api/products/noteworthy?${query.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch noteworthy products");
      const data = (await res.json()) as { products?: ShopProduct[] };
      return data.products ?? [];
    },
  });
}

export function useHomeSaleProducts(
  categorySlug: string,
  limit: number,
  sort: string,
) {
  return useQuery<{ products: ShopProduct[]; total: number }>({
    ...appQueryKeys.home.saleProducts(categorySlug, limit, sort),
    staleTime: 60_000,
    queryFn: async () => {
      const query = new URLSearchParams({ limit: String(limit), sort });
      if (categorySlug) query.set("category", categorySlug);
      const res = await fetch(`/api/products/sale?${query.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch sale products");
      return res.json() as Promise<{ products: ShopProduct[]; total: number }>;
    },
    placeholderData: (prev) => prev,
  });
}

export function useHomeTrustProps() {
  return useQuery<TrustProp[]>({
    ...appQueryKeys.home.trustProps,
    staleTime: 600_000,
    queryFn: async () => {
      const res = await fetch("/api/home/trust-props");
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
  });
}

export function useHomeCreators() {
  return useQuery<Creator[]>({
    ...appQueryKeys.home.creators,
    staleTime: 600_000,
    queryFn: async () => {
      const res = await fetch("/api/home/creators");
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
  });
}

export function useHomeTestimonials() {
  return useQuery<Testimonial[]>({
    ...appQueryKeys.home.testimonials,
    staleTime: 600_000,
    queryFn: async () => {
      const res = await fetch("/api/home/testimonials");
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
  });
}

export function useNewsletterSubscribe() {
  return useMutation({
    mutationFn: async (email: string) => {
      const res = await fetch("/api/newsletter/subscribe", {
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
