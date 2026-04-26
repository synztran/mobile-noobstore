import type { AddToCartRequest } from "@/app/api/cart/add/route";
import type { ConfiguratorGroup } from "@/app/api/products/[slug]/configurator/route";
import type { ProductDetail } from "@/app/api/products/[slug]/route";
import type { ShopVariant } from "@/app/api/products/route";
import type { Product, SelectedComponent } from "@/lib/data";
import { toast } from "@/lib/toast";
import { useCartStore } from "@/store";
import { useEffect, useMemo, useState } from "react";

export type UseProductViewDataReturn = {
	variants: ShopVariant[];
	groups: ConfiguratorGroup[];
	selections: Record<string, string>;
	select: (group: string, variantId: string) => void;
	selectedVariant: ShopVariant | null;
	loadingVariants: boolean;
	loadingConfigurator: boolean;
	missingVariantSelection: boolean;
	missingConfiguration: boolean;
	missingRequiredGroups: string[];
	effectiveStockQuantity: number;
	isOutOfStock: boolean;
	isLowStock: boolean;
	isLoadingAddToCart: boolean;
	handleAddToCart: () => Promise<void>;
};

/**
 * Manages selection state for the product detail page.
 * All product + component group data is server-provided — no client fetches.
 */
export function useProductViewData(
	product: ProductDetail,
	initialGroups: ConfiguratorGroup[] = [],
): UseProductViewDataReturn {
	const [selections, setSelections] = useState<Record<string, string>>({});
	const [isLoadingAddToCart, setIsLoadingAddToCart] = useState(false);
	const { addItem, openCart } = useCartStore();

	// Auto-select when there is only one variant
	useEffect(() => {
		if (product.variants.length === 1) {
			setSelections({ __variant__: product.variants[0].id });
		}
	}, [product.variants]);

	// Reset selections when navigating to a different product
	useEffect(() => {
		setSelections({});
	}, [product.id]);

	const select = (group: string, variantId: string) =>
		setSelections((curr) => ({ ...curr, [group]: variantId }));

	// All component group variants mapped to ShopVariant shape (with computed effective_price)
	const groupVariants = useMemo<ShopVariant[]>(
		() =>
			initialGroups.flatMap((g) =>
				g.variants.map((v) => ({
					id: v.id,
					variant_name: v.variant_name,
					price_adjustment: v.price_adjustment,
					effective_price: product.base_price + v.price_adjustment,
					thumbnail: v.thumbnail,
					stock_quantity: v.stock_quantity,
				})),
			),
		[initialGroups, product.base_price],
	);

	// Derive selectedVariant only for simple variant products (not component-group kits)
	const selectedVariant = useMemo<ShopVariant | null>(() => {
		if (initialGroups.length > 0) return null;
		return (
			(product.variants.find(
				(v) => v.id === selections["__variant__"],
			) as ShopVariant) ?? null
		);
	}, [product.variants, selections, initialGroups]);

	const variants =
		product.variants.length > 0
			? (product.variants as ShopVariant[])
			: groupVariants;

	const missingRequiredGroups = initialGroups
		.filter((g) => g.is_required && !selections[g.component_group])
		.map((g) => g.component_group);
	const missingConfiguration = missingRequiredGroups.length > 0;
	const missingVariantSelection =
		product.variants.length > 0 && !selectedVariant;

	// For kit products, stock is the minimum across all selected component variants.
	// Falls back to product.stock_quantity for simple products or when nothing is selected yet.
	const effectiveStockQuantity = useMemo(() => {
		if (initialGroups.length === 0) return product.stock_quantity;
		const selectedVariants = initialGroups
			.map((g) =>
				g.variants.find((v) => v.id === selections[g.component_group]),
			)
			.filter((v): v is NonNullable<typeof v> => v !== undefined);
		if (selectedVariants.length === 0) return product.stock_quantity;
		return Math.min(...selectedVariants.map((v) => v.stock_quantity));
	}, [initialGroups, selections, product.stock_quantity]);

	const isOutOfStock = effectiveStockQuantity === 0;
	const isLowStock =
		effectiveStockQuantity > 0 && effectiveStockQuantity <= 5;

	const handleAddToCart = async () => {
		if (product.variants.length > 0 && !selectedVariant) {
			toast.error("Please select a variant");
			return;
		}
		if (missingConfiguration) {
			toast.error(`Vui lòng chọn: ${missingRequiredGroups.join(", ")}`);
			return;
		}
		if (isOutOfStock) {
			toast.error("Out of stock");
			return;
		}

		setIsLoadingAddToCart(true);

		const components: SelectedComponent[] = initialGroups.flatMap(
			(group) => {
				const v = group.variants.find(
					(v) => v.id === selections[group.component_group],
				);
				if (!v) return [];
				return [
					{
						variant_id: v.id,
						variant_name: v.variant_name,
						component_group: group.component_group,
						price_adjustment: v.price_adjustment,
						thumbnail: v.thumbnail,
					},
				];
			},
		);

		if (initialGroups.length > 0) {
			try {
				const body: AddToCartRequest = {
					parent_product_id: product.id,
					selected_variant_ids: components.map((c) => c.variant_id),
				};
				await fetch("/api/cart/add", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(body),
				});
			} catch {
				console.warn("[useProductViewData] cart/add API failed");
			}
		}

		const cartProduct: Product = {
			id: product.id,
			name: product.name,
			category: product.category,
			base_price: product.base_price,
			stock_quantity: product.stock_quantity,
			thumbnail: product.thumbnail,
		};

		try {
			addItem(
				cartProduct,
				initialGroups.length > 0 ? null : selectedVariant,
				components,
			);
			toast.success("Added to cart!");
			openCart();
		} finally {
			setIsLoadingAddToCart(false);
		}
	};

	return {
		variants,
		groups: initialGroups,
		selections,
		select,
		selectedVariant,
		loadingVariants: false,
		loadingConfigurator: false,
		missingVariantSelection,
		missingConfiguration,
		missingRequiredGroups,
		effectiveStockQuantity,
		isOutOfStock,
		isLowStock,
		isLoadingAddToCart,
		handleAddToCart,
	};
}
