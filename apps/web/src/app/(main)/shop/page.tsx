import type { SortOption } from "@/app/api/products/route";
import {
	ProductCard,
	ProductCardSkeleton,
} from "@/components/product/ProductCard";
import { ShopControls } from "@/components/shop/ShopControls";
import Icon from "@/components/ui/Icon";
import { getCategories, getProducts } from "@/lib/products-server";
import { Suspense } from "react";

interface ShopPageProps {
	searchParams: Promise<{
		search?: string;
		sort?: string;
		category?: string;
		priceMin?: string;
		priceMax?: string;
	}>;
}

// ─── Async product grid (suspendable) ────────────────────────────────────────

async function ProductGrid({
	search,
	categorySlug,
	priceMin,
	priceMax,
	sort,
}: {
	search?: string;
	categorySlug?: string;
	priceMin?: number;
	priceMax?: number;
	sort?: SortOption;
}) {
	const { products } = await getProducts({
		search,
		categorySlug,
		priceMin: priceMin ?? 0,
		priceMax: priceMax ?? 0,
		sort: sort ?? "newest",
	});

	if (products.length === 0) {
		return (
			<div className="flex justify-center items-center text-center py-16 gap-4">
				<Icon
					name="search_off"
					className="text-2xl text-outline-variant"
				/>
				<p className="text-on-surface-variant font-semibold">
					Không tìm thấy sản phẩm phù hợp
				</p>
			</div>
		);
	}

	return (
		<div className="grid grid-cols-2 gap-x-4 gap-y-8">
			{products.map((product) => (
				<ProductCard key={product.id} product={product} />
			))}
		</div>
	);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ShopPage({ searchParams }: ShopPageProps) {
	const sp = await searchParams;

	const [{ total }, categories] = await Promise.all([
		getProducts({
			search: sp.search,
			categorySlug: sp.category,
			priceMin: sp.priceMin ? Number(sp.priceMin) : 0,
			priceMax: sp.priceMax ? Number(sp.priceMax) : 0,
			sort: (sp.sort as SortOption) ?? "newest",
		}),
		getCategories(),
	]);

	return (
		<div className="px-4 py-4">
			<Suspense fallback={null}>
				<ShopControls total={total} categories={categories} />
			</Suspense>

			<Suspense fallback={<ShopPageSkeleton />}>
				<ProductGrid
					search={sp.search}
					categorySlug={sp.category}
					priceMin={sp.priceMin ? Number(sp.priceMin) : 0}
					priceMax={sp.priceMax ? Number(sp.priceMax) : 0}
					sort={(sp.sort as SortOption) ?? "newest"}
				/>
			</Suspense>
		</div>
	);
}

function ShopPageSkeleton() {
	return (
		<div className="animate-pulse">
			{/* Search bar */}
			<div className="h-12 bg-surface-container rounded-full mb-6" />

			{/* Header row: result count + filter/sort buttons */}
			<div className="flex justify-between items-center mb-4">
				<div className="space-y-2">
					<div className="h-2 w-16 bg-surface-container rounded-full" />
					<div className="h-7 w-24 bg-surface-container rounded-full" />
				</div>
				<div className="flex gap-2">
					<div className="h-9 w-16 bg-surface-container rounded-full" />
					<div className="h-9 w-20 bg-surface-container rounded-full" />
				</div>
			</div>

			{/* Product grid */}
			<div className="grid grid-cols-2 gap-x-4 gap-y-8">
				{Array.from({ length: 6 }).map((_, i) => (
					<ProductCardSkeleton key={i} />
				))}
			</div>
		</div>
	);
}
