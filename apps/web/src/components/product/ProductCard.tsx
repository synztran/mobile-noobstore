"use client";

import type { ShopProduct } from "@/app/api/products/route";
import Icon from "@/components/ui/Icon";
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
					</div>

					{/* ── Details ─────────────────────────────────────────────── */}
					<div className="space-y-1">
						<p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-primary leading-none">
							{product.category}
						</p>
						<h3 className="text-sm font-bold text-on-surface capitalize line-clamp-2 min-h-[35px]">
							{product.name}
						</h3>
						<div className="text-base font-extrabold text-on-surface text-right">
							{formatVND(product.min_price)}
						</div>
						<StockIndicator
							stockQuantity={product.stock_quantity}
						/>
					</div>
				</Link>

				<button
					type="button"
					onClick={handleQuickAdd}
					aria-label={`Quick add ${product.name}`}
					className="mt-auto w-full h-10 rounded-xl bg-on-surface text-surface font-black text-[10px] uppercase tracking-[0.14em] flex items-center justify-center gap-2 transition-all hover:bg-on-surface/90 active:scale-[0.98]">
					<Icon name="add_shopping_cart" className="text-[16px]" />
					Mua ngay
				</button>
			</div>

			<QuickPickDrawer
				product={product}
				isOpen={drawerOpen}
				onClose={() => setDrawerOpen(false)}
			/>
		</>
	);
}
