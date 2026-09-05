import { ProductCardSkeleton } from "@/modules/products/ui/product/ProductCard";

export default function ShopLoading() {
	return (
		<div className="mx-auto max-w-7xl px-4 py-8">
			<div className="skeleton mb-8 h-8 w-48 rounded-lg bg-surface-container" />
			<div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
				{Array.from({ length: 8 }, (_, i) => (
					<ProductCardSkeleton key={i} />
				))}
			</div>
		</div>
	);
}
