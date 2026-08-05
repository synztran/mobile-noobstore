"use client";

import type { WishlistItemResponse } from "@/app/api/wishlist/route";
import { toGAProduct, trackRemoveWishlist, trackWishlist } from "@/lib/analytics";
import { useAuth } from "@/lib/auth/AuthProvider";
import { toast } from "@/lib/toast";
import {
	useWishlistAddMutation,
	useWishlistQuery,
	useWishlistRemoveMutation,
} from "@/lib/react-query/user/api/useUserQueries";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useRef, useState } from "react";

// Shared query key — all hook instances share a single cache entry.
// React Query deduplicates concurrent requests with the same key,
// so 20 WishlistButtons on the shop page fire exactly 1 HTTP request.

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
	addToWishlist: (productId: string, meta?: ProductMeta) => Promise<void>;
	removeFromWishlist: (productId: string, meta?: ProductMeta) => Promise<void>;
	toggleWishlist: (productId: string, meta?: ProductMeta) => Promise<void>;
	isInWishlist: (productId: string) => boolean;
	isPendingFor: (productId: string) => boolean;
}

export type ProductMeta = {
	id: string;
	name: string;
	category?: string | null;
	brand?: string | null;
	price?: number;
	base_price?: number;
	discount_price?: number;
};

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
	} = useWishlistQuery(!!user, initialItems);

	const wishlistProductIdsRef = useRef(new Set<string>());
	wishlistProductIdsRef.current = useMemo(
		() => new Set(items.map((item) => item.product_id)),
		[items],
	);

	// ── Add ──────────────────────────────────────────────────────────────────
	const addMutation = useWishlistAddMutation();

	// ── Remove ───────────────────────────────────────────────────────────────
	const removeMutation = useWishlistRemoveMutation();

	// ── Public API ───────────────────────────────────────────────────────────
	const fetchWishlist = useCallback(async () => {
		await queryClient.invalidateQueries({ queryKey: ["user", "wishlist"] });
	}, [queryClient]);

	const addToWishlist = useCallback(
		async (productId: string, meta?: ProductMeta) => {
			if (!productId || wishlistProductIdsRef.current.has(productId)) return;
			markPending(productId);
			try {
				await addMutation.mutateAsync(productId);
				if (meta) trackWishlist(toGAProduct(meta));
				toast.success("Đã thêm vào yêu thích");
			} catch (err) {
				toast.error(
					err instanceof Error
						? err.message
						: "Failed to add wishlist item",
				);
			} finally {
				unmarkPending(productId);
			}
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[addMutation],
	);

	const removeFromWishlist = useCallback(
		async (productId: string, meta?: ProductMeta) => {
			if (!productId) return;
			markPending(productId);
			try {
				await removeMutation.mutateAsync(productId);
				if (meta) trackRemoveWishlist(toGAProduct(meta));
				toast.success("Đã xóa khỏi yêu thích");
			} catch (err) {
				toast.error(
					err instanceof Error
						? err.message
						: "Failed to remove wishlist item",
				);
			} finally {
				unmarkPending(productId);
			}
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[removeMutation],
	);

	const isInWishlist = useCallback(
		(productId: string) => wishlistProductIdsRef.current.has(productId),
		[],
	);

	const isPendingFor = useCallback(
		(productId: string) => pendingIdsRef.current.has(productId),
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[],
	);

	const toggleWishlist = useCallback(
		async (productId: string, meta?: ProductMeta) => {
			if (isInWishlist(productId)) {
				await removeFromWishlist(productId, meta);
				return;
			}
			await addToWishlist(productId, meta);
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
	};
}
