import type {
	CartItem,
	Product,
	ProductVariant,
	SelectedComponent,
	ShippingDetails,
} from "@/lib/data";
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface CartStore {
	items: CartItem[];
	cartId: string | null;
	isOpen: boolean;
	addItem: (
		product: Product,
		variant: ProductVariant | null,
		components?: SelectedComponent[],
	) => void;
	removeItem: (productId: string, variantId: string | null) => void;
	updateQty: (
		productId: string,
		variantId: string | null,
		delta: number,
	) => void;
	clearCart: () => void;
	openCart: () => void;
	closeCart: () => void;
	total: () => number;
	subtotal: () => number;
	itemCount: () => number;
}

export const useCartStore = create<CartStore>()(
	persist(
		(set, get) => ({
			items: [],
			cartId: null,
			isOpen: false,

				addItem: (product, variant, components) => {
					set((state) => {
						const cartId = state.cartId ?? crypto.randomUUID();
						// Kit items (have components) are always standalone — never merged.
						const isKit = (components?.length ?? 0) > 0;
						const existing = !isKit
							? state.items.find(
									(i) =>
										i.product.id === product.id &&
										i.variant?.id === variant?.id,
							  )
							: undefined;
						if (existing) {
						return {
							cartId,
							items: state.items.map((i) =>
								i.product.id === product.id &&
								i.variant?.id === variant?.id
									? { ...i, quantity: i.quantity + 1 }
									: i,
							),
						};
					}
					return {
						cartId,
						items: [
							...state.items,
							{
								product,
								variant: variant ?? null,
								components: components ?? [],
								quantity: 1,
							},
						],
					};
				});
			},

			removeItem: (productId, variantId) => {
				set((state) => ({
					items: state.items.filter(
						(i) =>
							!(
								i.product.id === productId &&
								(i.variant?.id ?? null) === variantId
							),
					),
				}));
			},

			updateQty: (productId, variantId, delta) => {
				set((state) => ({
					items: state.items
						.map((i) => {
							if (
								i.product.id === productId &&
								(i.variant?.id ?? null) === variantId
							) {
								const newQty =
									delta > 0
										? Math.min(
												i.quantity + delta,
												i.product.stock_quantity,
											)
										: Math.max(0, i.quantity + delta);
								return { ...i, quantity: newQty };
							}
							return i;
						})
						.filter((i) => i.quantity > 0),
				}));
			},

			clearCart: () => set({ items: [], cartId: null }),
			openCart: () => set({ isOpen: true }),
			closeCart: () => set({ isOpen: false }),

			total: () =>
				get().items.reduce((sum, i) => {
					const basePrice =
						i.variant?.effective_price ?? i.product.base_price;
					const componentsTotal = (i.components ?? []).reduce(
						(s, c) => s + c.price_adjustment,
						0,
					);
					return sum + (basePrice + componentsTotal) * i.quantity;
				}, 0),

			subtotal: () =>
				get().items.reduce((sum, i) => {
					const componentsTotal = (i.components ?? []).reduce(
						(s, c) => s + c.price_adjustment,
						0,
					);
					return (
						sum +
						(i.product.base_price + componentsTotal) * i.quantity
					);
				}, 0),

			itemCount: () =>
				get().items.reduce((sum, i) => sum + i.quantity, 0),
		}),
		{ name: "noobstore-cart", skipHydration: true },
	),
);

interface CheckoutStore {
	shipping: ShippingDetails | null;
	shippingCost: number;
	orderId: string | null;
	orderNumber: string | null;
	totalPrice: number;
	orderedItems: CartItem[];
	setShipping: (data: ShippingDetails, cost: number) => void;
	setOrder: (
		id: string,
		orderNumber: string,
		totalPrice: number,
		orderedItems: CartItem[],
	) => void;
	clearCheckout: () => void;
}

export const useCheckoutStore = create<CheckoutStore>()(
	persist(
		(set) => ({
			shipping: null,
			shippingCost: 0,
			orderId: null,
			orderNumber: null,
			totalPrice: 0,
			orderedItems: [],
			setShipping: (data, cost) =>
				set({ shipping: data, shippingCost: cost }),
			setOrder: (id, orderNumber, totalPrice, orderedItems) =>
				set({ orderId: id, orderNumber, totalPrice, orderedItems }),
			clearCheckout: () =>
				set({
					shipping: null,
					shippingCost: 0,
					orderId: null,
					orderNumber: null,
					totalPrice: 0,
					orderedItems: [],
				}),
		}),
		{ name: "noobstore-checkout" },
	),
);
