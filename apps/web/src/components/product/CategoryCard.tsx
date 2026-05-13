"use client";

import Icon from "@/components/ui/Icon";
import type { CategoryItem } from "@/lib/products-server";
import Image from "next/image";
import { useState } from "react";
import { QuickPickDrawer } from "./QuickPickDrawer";

// ─── Skeleton ─────────────────────────────────────────────────────────

export function CategoryCardSkeleton() {
	return (
		<div className="animate-pulse">
			<div className="aspect-[4/5] bg-surface-container rounded-xl mb-3" />
			<div className="space-y-1.5">
				<div className="h-3 w-4/5 bg-surface-container rounded-full" />
			</div>
		</div>
	);
}

// ─── Card ─────────────────────────────────────────────────────────────

interface CategoryCardProps {
	category: CategoryItem;
}

export function CategoryCard({ category }: CategoryCardProps) {
	const [drawerOpen, setDrawerOpen] = useState(false);

	const handleBrowse = (e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();
		setDrawerOpen(true);
	};

	return (
		<>
			<div className="group block">
				{/* ── Image box ─────────────────────────────────────────── */}
				<div
					className="relative aspect-[4/5] bg-surface-container rounded-xl mb-3 overflow-hidden"
					style={{
						boxShadow: "0 20px 40px -15px rgba(155,63,28,0.08)",
					}}>
					{/* Thumbnail or placeholder */}
					{category.thumbnail ? (
						<Image
							src={category.thumbnail}
							alt={category.name}
							fill
							className="object-cover"
							sizes="(max-width: 640px) 50vw, 25vw"
						/>
					) : (
						<div className="absolute inset-0 flex items-center justify-center">
							<Icon
								name="category"
								className="text-5xl text-outline-variant"
							/>
						</div>
					)}

					{/* Browse button */}
					<button
						onClick={handleBrowse}
						aria-label={`Xem sản phẩm ${category.name}`}
						className="absolute bottom-3 right-3 z-20 w-9 h-9 rounded-full bg-on-surface text-surface flex items-center justify-center translate-y-1 group-hover:translate-y-0 transition-all duration-200 shadow-lg active:scale-90">
						<Icon name="arrow_forward" className="text-[18px]" />
					</button>
				</div>

				{/* ── Details ───────────────────────────────────────────── */}
				<div className="space-y-1">
					<h3 className="text-sm font-bold leading-tight text-on-surface uppercase line-clamp-2 min-h-[35px]">
						{category.name}
					</h3>
				</div>
			</div>

			<QuickPickDrawer
				mode="category"
				category={category}
				isOpen={drawerOpen}
				onClose={() => setDrawerOpen(false)}
			/>
		</>
	);
}
