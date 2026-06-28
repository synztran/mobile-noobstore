import { appQueryKeys } from "@/lib/react-query/root";
import { useQuery } from "@tanstack/react-query";

export interface ReviewItem {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  created_at: string;
  reviewer_name: string;
}

export interface ReviewsResponse {
  reviews: ReviewItem[];
  average: number;
  total: number;
}

export function useReviews(productSlug: string) {
  return useQuery<ReviewsResponse>({
    ...appQueryKeys.review.list(productSlug),
    queryFn: async () => {
      const res = await fetch(`/api/products/${productSlug}/reviews`);
      if (!res.ok) return { reviews: [], average: 0, total: 0 };
      return res.json() as Promise<ReviewsResponse>;
    },
  });
}
