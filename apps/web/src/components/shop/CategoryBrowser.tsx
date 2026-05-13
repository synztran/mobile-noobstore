"use client";

import { QuickPickDrawer } from "@/components/product/QuickPickDrawer";
import type { CategoryItem } from "@/lib/products-server";
import Image from "next/image";
import { useState } from "react";

interface CategoryBrowserProps {
	categories: CategoryItem[];
}

export function CategoryBrowser({ categories }: CategoryBrowserProps) {
	const [selectedCategory, setSelectedCategory] =
		useState<CategoryItem | null>(null);

	return (
		<>
			<div className="grid grid-cols-2 gap-3">
				{categories.map((cat) => (
					<button
						key={cat.id}
						type="button"
						onClick={() => setSelectedCategory(cat)}
						className="relative aspect-square rounded-2xl overflow-hidden bg-surface-container active:scale-[0.97] transition-transform">
						{cat.thumbnail ? (
							<Image
								src={cat.thumbnail}
								alt={cat.name}
								fill
								className="object-cover"
								sizes="(max-width: 640px) 50vw, 25vw"
							/>
						) : (
							<div className="absolute inset-0 bg-surface-container-high" />
						)}
						<div className="absolute inset-0 bg-gradient-to-t from-on-surface/70 via-transparent to-transparent flex items-end p-4">
							<h3 className="text-white font-black uppercase text-sm tracking-wide leading-tight text-left">
								{cat.name}
							</h3>
						</div>
					</button>
				))}
			</div>

			<QuickPickDrawer
				mode="category"
				category={selectedCategory}
				isOpen={!!selectedCategory}
				onClose={() => setSelectedCategory(null)}
			/>
		</>
	);
}
