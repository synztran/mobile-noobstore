"use client";

import type { AddWishlistResponse } from "@/app/api/wishlist/add/route";
import type { WishlistItemResponse } from "@/app/api/wishlist/route";
import { useAuth } from "@/lib/auth/AuthProvider";
import { toast } from "@/lib/toast";
import { useCallback, useEffect, useMemo, useState } from "react";

interface UseWishlistOptions {
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
	wishlistProductIds: Set<string>;
}

export function useWishlist(
	options: UseWishlistOptions = {},
): UseWishlistResult {
	const { autoFetch = true, initialItems = [] } = options;
	const { user } = useAuth();

	const [items, setItems] = useState<WishlistItemResponse[]>(initialItems);
	const [loading, setLoading] = useState(
		autoFetch && initialItems.length === 0,
	);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const wishlistProductIds = useMemo(
		() => new Set(items.map((item) => item.product_id)),
		[items],
	);

	const fetchWishlist = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const res = await fetch("/api/wishlist", { method: "GET" });

			if (res.status === 401) {
				setItems([]);
				return;
			}

			if (!res.ok) {
				const payload = (await res.json().catch(() => null)) as {
					error?: string;
				} | null;
				throw new Error(payload?.error ?? "Failed to fetch wishlist");
			}

			const data = (await res.json()) as WishlistItemResponse[];
			setItems(data);
		} catch (err) {
			const message =
				err instanceof Error ? err.message : "Failed to fetch wishlist";
			setError(message);
		} finally {
			setLoading(false);
		}
	}, []);

	const addToWishlist = useCallback(
		async (productId: string) => {
			if (!productId) return;
			setBusy(true);
			setError(null);
			try {
				const exists = wishlistProductIds.has(productId);
				if (exists) return;

				const res = await fetch("/api/wishlist/add", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ productId }),
				});

				if (res.status === 401) {
					throw new Error("Bạn cần đăng nhập để lưu yêu thích");
				}

				if (!res.ok) {
					const payload = (await res.json().catch(() => null)) as {
						error?: string;
					} | null;
					throw new Error(
						payload?.error ?? "Failed to add wishlist item",
					);
				}

				const payload = (await res.json()) as AddWishlistResponse;
				setItems((prev) => [
					{
						id: payload.wishlistId,
						product_id: productId,
						added_at: new Date().toISOString(),
						product: null,
					},
					...prev,
				]);
				void fetchWishlist();
				toast.success("Đã thêm vào yêu thích");
			} catch (err) {
				const message =
					err instanceof Error
						? err.message
						: "Failed to add wishlist item";
				setError(message);
				toast.error(message);
			} finally {
				setBusy(false);
			}
		},
		[fetchWishlist, wishlistProductIds],
	);

	const removeFromWishlist = useCallback(
		async (productId: string) => {
			if (!productId) return;
			setBusy(true);
			setError(null);

			const previous = items;
			setItems((prev) =>
				prev.filter((item) => item.product_id !== productId),
			);

			try {
				const res = await fetch("/api/wishlist/remove", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ productId }),
				});

				if (res.status === 401) {
					throw new Error("Bạn cần đăng nhập để chỉnh sửa yêu thích");
				}

				if (!res.ok) {
					const payload = (await res.json().catch(() => null)) as {
						error?: string;
					} | null;
					throw new Error(
						payload?.error ?? "Failed to remove wishlist item",
					);
				}

				toast.success("Đã xóa khỏi yêu thích");
			} catch (err) {
				setItems(previous);
				const message =
					err instanceof Error
						? err.message
						: "Failed to remove wishlist item";
				setError(message);
				toast.error(message);
			} finally {
				setBusy(false);
			}
		},
		[items],
	);

	const isInWishlist = useCallback(
		(productId: string) => wishlistProductIds.has(productId),
		[wishlistProductIds],
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

	useEffect(() => {
		if (!autoFetch) return;
		if (!user) {
			setItems([]);
			setLoading(false);
			return;
		}
		void fetchWishlist();
	}, [autoFetch, fetchWishlist, user]);

	return {
		items,
		loading,
		busy,
		error,
		fetchWishlist,
		addToWishlist,
		removeFromWishlist,
		toggleWishlist,
		isInWishlist,
		wishlistProductIds,
	};
}
