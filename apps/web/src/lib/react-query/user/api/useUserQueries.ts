import type { AddWishlistResponse } from "@/app/api/wishlist/add/route";
import type { WishlistItemResponse } from "@/app/api/wishlist/route";
import { appQueryKeys } from "@/lib/react-query/root";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const WISHLIST_KEY = appQueryKeys.user.wishlist.queryKey;

export function useWishlistQuery(
	enabled: boolean,
	initialData?: WishlistItemResponse[],
) {
	return useQuery<WishlistItemResponse[]>({
		...appQueryKeys.user.wishlist,
		enabled,
		staleTime: 60_000,
		initialData: initialData?.length ? initialData : undefined,
		queryFn: async () => {
			const res = await fetch("/api/wishlist");
			if (res.status === 401) return [];
			if (!res.ok) {
				const payload = (await res.json().catch(() => null)) as {
					error?: string;
				} | null;
				throw new Error(payload?.error ?? "Failed to fetch wishlist");
			}
			return res.json() as Promise<WishlistItemResponse[]>;
		},
	});
}

export function useWishlistAddMutation() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (productId: string): Promise<AddWishlistResponse> => {
			const res = await fetch("/api/wishlist/add", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ productId }),
			});
			if (res.status === 401)
				throw new Error("Bạn cần đăng nhập để lưu yêu thích");
			if (!res.ok) {
				const payload = (await res.json().catch(() => null)) as {
					error?: string;
				} | null;
				throw new Error(
					payload?.error ?? "Failed to add wishlist item",
				);
			}
			return res.json() as Promise<AddWishlistResponse>;
		},
		onMutate: async (productId) => {
			await queryClient.cancelQueries({ queryKey: WISHLIST_KEY });
			const previous = queryClient.getQueryData<WishlistItemResponse[]>(WISHLIST_KEY);
			queryClient.setQueryData<WishlistItemResponse[]>(
				WISHLIST_KEY,
				(prev = []) => [
					...prev,
					{ product_id: productId, id: `opt-${productId}`, added_at: new Date().toISOString(), product: null },
				],
			);
			return { previous };
		},
		onError: (_err, _productId, context) => {
			if (context?.previous) {
				queryClient.setQueryData(WISHLIST_KEY, context.previous);
			}
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: WISHLIST_KEY });
		},
	});
}

export function useWishlistRemoveMutation() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (productId: string): Promise<void> => {
			const res = await fetch("/api/wishlist/remove", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ productId }),
			});
			if (res.status === 401)
				throw new Error("Bạn cần đăng nhập để chỉnh sửa yêu thích");
			if (!res.ok) {
				const payload = (await res.json().catch(() => null)) as {
					error?: string;
				} | null;
				throw new Error(
					payload?.error ?? "Failed to remove wishlist item",
				);
			}
		},
		onMutate: async (productId) => {
			const previous =
				queryClient.getQueryData<WishlistItemResponse[]>(WISHLIST_KEY);
			queryClient.setQueryData<WishlistItemResponse[]>(
				WISHLIST_KEY,
				(prev = []) =>
					prev.filter((item) => item.product_id !== productId),
			);
			return { previous };
		},
		onError: (_err, _productId, context) => {
			if (context?.previous) {
				queryClient.setQueryData(WISHLIST_KEY, context.previous);
			}
		},
	});
}
