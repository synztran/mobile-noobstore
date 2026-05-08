"use client";

import type { ShopProduct } from "@/app/api/products/route";
import Icon from "@/components/ui/Icon";
import WishlistButton from "@/components/wishlist/WishlistButton";
import { formatVND } from "@/lib/currency";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import ProductComponentTags from "./ProductComponentTags";
import { QuickPickDrawer } from "./QuickPickDrawer";
import { StockIndicator } from "./StockIndicator";

// ─── Skeleton ─────────────────────────────────────────────────────────

export function ProductCardSkeleton() {
	return (
		<div className="animate-pulse">
			<div className="aspect-[4/5] bg-surface-container rounded-xl mb-3" />
			<div className="space-y-1.5">
				<div className="h-2 w-1/3 bg-surface-container rounded-full" />
				<div className="h-3 w-4/5 bg-surface-container rounded-full" />
				<div className="h-3 w-2/5 bg-surface-container rounded-full" />
			</div>
		</div>
	);
}

// ─── Card ────────────────────────────────────────────────────────────────

interface ProductCardProps {
	product: ShopProduct;
}

export function ProductCard({ product }: ProductCardProps) {
	const [drawerOpen, setDrawerOpen] = useState(false);

	const handleQuickAdd = (e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();
		setDrawerOpen(true);
	};

	return (
		<>
			<div className="group flex flex-col justify-between relative gap-2">
				<Link href={`/shop/${product.slug}`} className="block">
					{/* ── Image box ─────────────────────────────────────────────── */}
					<div
						className="relative aspect-[4/4] bg-surface-container rounded-xl mb-3 overflow-hidden"
						style={{
							boxShadow: "0 20px 40px -15px rgba(155,63,28,0.08)",
						}}>
						{/* Thumbnail or placeholder */}
						{product.thumbnail ? (
							<>
								{/* Skeleton shimmer — hidden once image loads */}
								<Image
									src={product.thumbnail}
									alt={product.name}
									fill
									objectFit="cover"
									unoptimized
								/>
							</>
						) : (
							<div className="absolute inset-0 flex items-center justify-center">
								<Icon
									name="inventory_2"
									className="text-5xl text-outline-variant"
								/>
							</div>
						)}

						{/* Variants badge */}
						{product.variants.length > 0 && (
							<span className="absolute top-3 left-3 z-10 text-[10px] font-black px-2.5 py-1 rounded tracking-tighter bg-surface-container-lowest text-on-surface">
								{product.variants.length} option
								{product.variants.length > 1 ? "s" : ""}
							</span>
						)}

						<ProductComponentTags horizontalTags={product?.tags} />

						{/* Pre-order banner */}
						{product.is_pre_order && !!product.stock_quantity && (
							<div className="absolute inset-x-0 bottom-0 z-20 flex items-center justify-center gap-1.5 py-2 bg-violet-600/90 backdrop-blur-sm">
								<Icon
									name="schedule"
									className="text-white text-sm"
								/>
								<p className="text-[10px] font-black uppercase tracking-[0.18em] text-white">
									Đặt trước
								</p>
							</div>
						)}

						{!product.stock_quantity && (
							<div className="absolute inset-0 bg-surface/70 flex items-center justify-center rounded-xl">
								<p className="text-sm font-black uppercase tracking-[0.15em] text-on-surface-variant">
									Hết hàng
								</p>
							</div>
						)}
					</div>

					{/* ── Details ─────────────────────────────────────────────── */}
					<div className="space-y-1">
						<p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-primary leading-none truncate">
							{product.brand || product.category}
						</p>
						<h3 className="text-sm font-bold text-on-surface capitalize line-clamp-2 min-h-[40px]">
							{product.name}
						</h3>
						<p className="text-xs tracking-wide line-clamp-2 min-h-[32px]">
							{product.description}
						</p>
						<div className="text-base font-extrabold text-on-surface text-right">
							{formatVND(product.min_price)}
						</div>
					</div>
				</Link>

				<div className="flex flex-col gap-0.5">
					<StockIndicator stockQuantity={product.stock_quantity} />
					<div className="mt-auto flex items-center gap-1">
						<WishlistButton
							productId={product.id}
							size="sm"
							showLabel
							className="w-[40px] h-full rounded-xl"
						/>
						<button
							type="button"
							onClick={handleQuickAdd}
							aria-label={`Quick add ${product.name}`}
							disabled={product.stock_quantity === 0}
							className="flex-1 h-10 rounded-xl bg-on-surface text-surface font-black text-[10px] uppercase tracking-[0.14em] flex items-center justify-center gap-2 transition-all hover:bg-on-surface/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-on-surface/50 disabled:text-surface/50">
							<Icon
								name="add_shopping_cart"
								className="text-[16px]"
							/>
							Mua ngay
						</button>
					</div>
				</div>
			</div>

			<QuickPickDrawer
				product={product}
				isOpen={drawerOpen}
				onClose={() => setDrawerOpen(false)}
			/>
		</>
	);
}
