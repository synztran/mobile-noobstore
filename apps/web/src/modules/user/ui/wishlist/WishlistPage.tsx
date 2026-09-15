"use client";

import type { WishlistItemResponse } from "@/modules/user/types";
import { Heart, ImageOff, X } from "lucide-react";
import { useWishlist } from "@/modules/user/client/useWishlist";
import { formatVND } from "@/lib/currency";
import Image from "@/components/ui/AdaptiveImage";
import Link from "next/link";

interface WishlistPageProps {
	initialItems?: WishlistItemResponse[];
}

export function WishlistPage({ initialItems = [] }: WishlistPageProps) {
	const { items, loading, busy, removeFromWishlist } = useWishlist({
		initialItems,
	});

	if (loading) {
		return (
			<div className="px-4 pt-3 pb-24 space-y-4">
				<div className="h-8 w-48 bg-surface-container animate-pulse rounded-xl" />
				{[1, 2, 3].map((i) => (
					<div
						key={i}
						className="animate-pulse bg-surface-container rounded-3xl p-4 flex gap-3">
						<div className="w-20 h-20 rounded-2xl bg-surface-container-high" />
						<div className="flex-1 space-y-2">
							<div className="h-4 w-3/4 rounded-full bg-surface-container-high" />
							<div className="h-3 w-1/2 rounded-full bg-surface-container-high" />
							<div className="h-4 w-1/3 rounded-full bg-surface-container-high" />
						</div>
					</div>
				))}
			</div>
		);
	}

	if (items.length === 0) {
		return (
			<div className="px-6 pt-8 pb-24 flex flex-col items-center justify-center text-center">
				<div className="w-20 h-20 rounded-full bg-surface-container flex items-center justify-center mb-4">
					<Heart className="h-8 w-8 text-outline-variant" />
				</div>
				<h1 className="text-xl font-black text-on-surface">
					Danh sách yêu thích
				</h1>
				<p className="text-sm text-on-surface-variant mt-2 max-w-xs">
					Bạn chưa lưu sản phẩm nào. Hãy khám phá cửa hàng và thêm
					những món bạn thích.
				</p>
				<Link
					href="/shop"
					className="mt-5 h-11 px-5 rounded-xl bg-blue-600 text-white text-xs font-black uppercase tracking-wider inline-flex items-center justify-center">
					Khám phá cửa hàng
				</Link>
			</div>
		);
	}

	return (
		<div className="px-4 pt-3 pb-24 space-y-4">
			<div>
				<p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
					Wishlist
				</p>
				<h1 className="text-2xl font-black text-on-surface mt-1">
					Sản phẩm yêu thích ({items.length})
				</h1>
			</div>

			<div className="space-y-3">
				{items.map((item) => {
					const product = item.product;
					return (
						<div
							key={item.id}
							className="bg-surface-container-lowest rounded-3xl p-4 flex gap-3 items-start shadow-ambient-sm">
							<div className="w-20 h-20 rounded-2xl bg-surface-container overflow-hidden relative flex-shrink-0">
								{product?.thumbnail ? (
									<Image
										src={product.thumbnail}
										alt={product.name}
										fill
										className="object-cover"
										sizes="80px"
									/>
								) : (
									<div className="w-full h-full flex items-center justify-center">											<ImageOff className="h-5 w-5 text-outline-variant" />
									</div>
								)}
							</div>

							<div className="flex-1 min-w-0">
								<p className="font-bold text-on-surface line-clamp-2">
									{product?.name ?? "Sản phẩm không khả dụng"}
								</p>
								{product?.brand ? (
									<p className="text-[11px] uppercase tracking-wider text-on-surface-variant mt-1">
										{product.brand}
									</p>
								) : null}
								<p className="text-sm font-black text-primary mt-2">
									{product
										? formatVND(product.base_price)
										: "--"}
								</p>

								<div className="mt-3 flex gap-2">
									{product?.slug ? (
										<Link
											href={`/shop/${product.slug}`}
											className="h-8 px-3 rounded-lg bg-blue-600 text-white text-[10px] font-black uppercase tracking-wider inline-flex items-center">
											Xem sản phẩm
										</Link>
									) : null}
									<button
										type="button"
										onClick={() =>
											void removeFromWishlist(
												item.product_id,
											)
										}
										disabled={busy}
										className="h-8 px-3 rounded-lg bg-surface-container text-on-surface-variant text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1 disabled:opacity-60">																<X className="h-3.5 w-3.5" />
										Xóa
									</button>
								</div>
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}

export default WishlistPage;
