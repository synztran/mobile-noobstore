import { appQueryKeys } from "@/lib/react-query/root";
import { useQuery } from "@tanstack/react-query";

export interface ReviewItem {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  created_at: string;
  reviewer_name: string;
  images?: string[];
  criteria?: {
    packaging: number | null;
    description: number | null;
    delivery: number | null;
  };
}

export interface ReviewsResponse {
  reviews: ReviewItem[];
  average: number;
  total: number;
}

export interface RecentReviewItem {
  id: string;
  rating: number;
  body: string | null;
  reviewer_name: string;
  created_at: string;
  product_name: string;
  product_slug: string;
  product_thumbnail: string | null;
  source: "native" | "google";
}

export function useReviews(productSlug: string) {
  return useQuery<ReviewsResponse>({
    ...appQueryKeys.review.list(productSlug),
    staleTime: 120_000,
    queryFn: async () => {
      const res = await fetch(`/api/products/${productSlug}/reviews`);
      if (!res.ok) return { reviews: [], average: 0, total: 0 };
      return res.json() as Promise<ReviewsResponse>;
    },
  });
}

export function useRecentReviews() {
  return useQuery<RecentReviewItem[]>({
    ...appQueryKeys.review.recent,
    staleTime: 120_000,
    queryFn: async () => {
      const res = await fetch("/api/reviews/recent");
      if (!res.ok) return [];
      return res.json() as Promise<RecentReviewItem[]>;
    },
  });
}
