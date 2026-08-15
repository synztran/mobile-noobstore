import type { CartApiItem } from "@/lib/cart-service";
import type { CartItem, Product, ProductVariant, SelectedComponent } from "@/lib/data";
import { appQueryKeys } from "@/lib/react-query/root";
import { useCartStore } from "@/store";
import { useQuery } from "@tanstack/react-query";

function transformToCartItem(item: CartApiItem): CartItem {
	const product: Product = {
		id: item.product?.id ?? item.product_id ?? "",
		name: item.product?.name ?? "",
		category: "",
		base_price: item.product?.base_price ?? 0,
		stock_quantity: item.product?.stock_quantity ?? 0,
		thumbnail: item.product?.thumbnail ?? null,
		is_pre_order: item.product?.is_pre_order ?? false,
		pre_order_config: item.product?.pre_order_config ?? null,
		brand: item.product?.brand ?? "",
	};

	const variant: ProductVariant | null = item.variant
		? {
				id: item.variant.id,
				variant_name: item.variant.variant_name,
				price_adjustment: item.variant.price_adjustment,
				effective_price: (item.product?.base_price ?? 0) + (item.variant.price_adjustment ?? 0),
				thumbnail: item.variant.thumbnail ?? null,
				is_pre_order: item.variant.is_pre_order ?? false,
				pre_order_config: item.variant.pre_order_config ?? null,
			}
		: null;

	const components: SelectedComponent[] = item.children
		.filter((c) => c.variant)
		.map((c) => ({
			variant_id: c.variant!.id,
			variant_name: c.variant!.variant_name,
			component_group: c.component_group ?? "",
			price_adjustment: c.variant!.price_adjustment,
			thumbnail: c.variant!.thumbnail ?? null,
			is_pre_order: c.variant!.is_pre_order ?? false,
			pre_order_config: c.variant!.pre_order_config ?? null,
		}));

	const hasAnyPreOrder = product.is_pre_order ?? variant?.is_pre_order ?? components.some((c) => c.is_pre_order) ?? false;
	const preOrderConfig = product.pre_order_config ?? variant?.pre_order_config ?? components.find((c) => c.pre_order_config)?.pre_order_config ?? null;

	return {
		id: item.id,
		product,
		variant,
		components: components.length > 0 ? components : undefined,
		quantity: item.quantity,
		is_pre_order: hasAnyPreOrder,
		pre_order_config: preOrderConfig,
	};
}

export function useCartQuery() {
	return useQuery({
		...appQueryKeys.cart.all,
		queryFn: async () => {
			const res = await fetch("/api/cart");
			if (!res.ok) throw new Error("Failed to fetch cart");
			const data = await res.json();

			const items: CartItem[] = (data.items ?? []).map(transformToCartItem);
			useCartStore.getState().setCart(items, data.cart_id);

			return data;
		},
		staleTime: 30_000,
		retry: 1,
	});
}
