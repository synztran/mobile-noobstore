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
	};

	const variant: ProductVariant | null = item.variant
		? {
				id: item.variant.id,
				variant_name: item.variant.variant_name,
				price_adjustment: item.variant.price_adjustment,
				effective_price: (item.product?.base_price ?? 0) + (item.variant.price_adjustment ?? 0),
				thumbnail: item.variant.thumbnail ?? null,
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
		}));

	return {
		id: item.id,
		product,
		variant,
		components: components.length > 0 ? components : undefined,
		quantity: item.quantity,
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
