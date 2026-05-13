"use client";

import type { AddWishlistResponse } from "@/app/api/wishlist/add/route";
import type { WishlistItemResponse } from "@/app/api/wishlist/route";
import { useAuth } from "@/lib/auth/AuthProvider";
import { toast } from "@/lib/toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useRef, useState } from "react";

// Shared query key — all hook instances share a single cache entry.
// React Query deduplicates concurrent requests with the same key,
// so 20 WishlistButtons on the shop page fire exactly 1 HTTP request.
const WISHLIST_KEY = ["wishlist"] as const;

interface UseWishlistOptions {
	/** @deprecated kept for API compatibility — deduplication is automatic */
	autoFetch?: boolean;
	initialItems?: WishlistItemResponse[];
}

interface UseWishlistResult {
	items: WishlistItemResponse[];
	loading: boolean;
	busy: boolean;
	error: string | null;
	fetchWishlist: () => Promise<void>;
	addToWishlist: (productId: string) => Promise<void>;
	removeFromWishlist: (productId: string) => Promise<void>;
	toggleWishlist: (productId: string) => Promise<void>;
	isInWishlist: (productId: string) => boolean;
	isPendingFor: (productId: string) => boolean;
	wishlistProductIds: Set<string>;
}

export function useWishlist(
	options: UseWishlistOptions = {},
): UseWishlistResult {
	const { initialItems } = options;
	const { user } = useAuth();
	const queryClient = useQueryClient();

	// Per-productId pending tracking — Set stored in a ref, state counter triggers re-renders
	const pendingIdsRef = useRef<Set<string>>(new Set());
	const [, setPendingVersion] = useState(0);
	const markPending = (id: string) => {
		pendingIdsRef.current.add(id);
		setPendingVersion((v) => v + 1);
	};
	const unmarkPending = (id: string) => {
		pendingIdsRef.current.delete(id);
		setPendingVersion((v) => v + 1);
	};

	const {
		data: items = [],
		isLoading,
		error: queryError,
	} = useQuery({
		queryKey: WISHLIST_KEY,
		queryFn: async (): Promise<WishlistItemResponse[]> => {
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
		// Only fetch when a user is logged in
		enabled: !!user,
		// Don't refetch for 60 s — wishlist is user-specific, rarely changes externally
		staleTime: 60_000,
		// Seed with server-provided data on first render (WishlistPage SSR case)
		initialData: initialItems?.length ? initialItems : undefined,
	});

	const wishlistProductIds = useMemo(
		() => new Set(items.map((item) => item.product_id)),
		[items],
	);

	// ── Add ──────────────────────────────────────────────────────────────────
	const addMutation = useMutation({
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
		onSuccess: (payload, productId) => {
			// Optimistic write — no need to refetch
			queryClient.setQueryData<WishlistItemResponse[]>(
				WISHLIST_KEY,
				(prev = []) => [
					{
						id: payload.wishlistId,
						product_id: productId,
						added_at: new Date().toISOString(),
						product: null,
					},
					...prev,
				],
			);
			toast.success("Đã thêm vào yêu thích");
		},
		onError: (err) => {
			const message =
				err instanceof Error
					? err.message
					: "Failed to add wishlist item";
			toast.error(message);
		},
	});

	// ── Remove ───────────────────────────────────────────────────────────────
	const removeMutation = useMutation({
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
			// Optimistic remove — revert on error
			const previous =
				queryClient.getQueryData<WishlistItemResponse[]>(WISHLIST_KEY);
			queryClient.setQueryData<WishlistItemResponse[]>(
				WISHLIST_KEY,
				(prev = []) =>
					prev.filter((item) => item.product_id !== productId),
			);
			return { previous };
		},
		onError: (err, _productId, context) => {
			if (context?.previous) {
				queryClient.setQueryData(WISHLIST_KEY, context.previous);
			}
			const message =
				err instanceof Error
					? err.message
					: "Failed to remove wishlist item";
			toast.error(message);
		},
		onSuccess: () => {
			toast.success("Đã xóa khỏi yêu thích");
		},
	});

	// ── Public API ───────────────────────────────────────────────────────────
	const fetchWishlist = useCallback(async () => {
		await queryClient.invalidateQueries({ queryKey: WISHLIST_KEY });
	}, [queryClient]);

	const addToWishlist = useCallback(
		async (productId: string) => {
			if (!productId || wishlistProductIds.has(productId)) return;
			markPending(productId);
			try {
				await addMutation.mutateAsync(productId);
			} finally {
				unmarkPending(productId);
			}
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[addMutation, wishlistProductIds],
	);

	const removeFromWishlist = useCallback(
		async (productId: string) => {
			if (!productId) return;
			markPending(productId);
			try {
				await removeMutation.mutateAsync(productId);
			} finally {
				unmarkPending(productId);
			}
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[removeMutation],
	);

	const isInWishlist = useCallback(
		(productId: string) => wishlistProductIds.has(productId),
		[wishlistProductIds],
	);

	const isPendingFor = useCallback(
		(productId: string) => pendingIdsRef.current.has(productId),
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[],
	);

	const toggleWishlist = useCallback(
		async (productId: string) => {
			if (isInWishlist(productId)) {
				await removeFromWishlist(productId);
				return;
			}
			await addToWishlist(productId);
		},
		[addToWishlist, isInWishlist, removeFromWishlist],
	);

	return {
		items,
		loading: isLoading,
		busy: addMutation.isPending || removeMutation.isPending,
		error: queryError instanceof Error ? queryError.message : null,
		fetchWishlist,
		addToWishlist,
		removeFromWishlist,
		toggleWishlist,
		isInWishlist,
		isPendingFor,
		wishlistProductIds,
	};
}
