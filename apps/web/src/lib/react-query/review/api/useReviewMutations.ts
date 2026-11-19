import { apiFetch } from "@/lib/api/fetch";
import { useMutation, useQueryClient } from "@tanstack/react-query";


export function useSubmitReview(productSlug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      rating: number;
      title?: string;
      body?: string;
      images?: string[];
      criteria?: {
        packaging: number | null;
        description: number | null;
        delivery: number | null;
      };
    }) => {
      const res = await apiFetch(`/api/products/${productSlug}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(payload?.error ?? "Gửi đánh giá thất bại");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["review"] });
    },
  });
}
