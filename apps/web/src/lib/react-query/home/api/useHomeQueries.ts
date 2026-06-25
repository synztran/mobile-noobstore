import type { CommunityPhoto } from "@/app/api/home/community-gallery/route";
import type { Creator } from "@/app/api/home/creators/route";
import type { HeroCampaign } from "@/app/api/home/hero/route";
import type { TrustProp } from "@/app/api/home/trust-props/route";
import type { ShopProduct } from "@/app/api/products/route";
import { appQueryKeys } from "@/lib/react-query/root";
import { useQuery } from "@tanstack/react-query";

export function useHomeHero() {
  return useQuery<HeroCampaign[]>({
    ...appQueryKeys.home.hero,
    queryFn: async () => {
      const res = await fetch("/api/home/hero");
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
  });
}

export function useHomeCommunityGallery(limit: number) {
  return useQuery<{ photos: CommunityPhoto[]; hasMore: boolean }>({
    ...appQueryKeys.home.communityGallery(limit),
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
    queryFn: async () => {
      const res = await fetch("/api/home/creators");
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
  });
}
