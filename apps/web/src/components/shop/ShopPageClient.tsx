"use client";

import { ProductCardSkeleton } from "@/components/product/ProductCard";
import { ShopControls } from "@/components/shop/ShopControls";
import type { CategoryItem } from "@/lib/products-server";
import { type ReactNode, useTransition } from "react";

// ─── Loading skeleton (mirrors ShopPage grid skeleton) ───────────────────────

function GridSkeleton() {
	return (
		<div className="grid grid-cols-2 gap-x-4 gap-y-8">
			{Array.from({ length: 6 }).map((_, i) => (
				<ProductCardSkeleton key={i} />
			))}
		</div>
	);
}

// ─── Client wrapper ───────────────────────────────────────────────────────────

export function ShopPageClient({
	total,
	categories,
	grid,
}: {
	total: number;
	categories: CategoryItem[];
	grid: ReactNode;
}) {
	const [isPending, startTransition] = useTransition();

	return (
		<>
			<ShopControls
				total={total}
				categories={categories}
				startTransition={startTransition}
        isLoading={isPending}
			/>

			{isPending ? <GridSkeleton /> : grid}
		</>
	);
}
