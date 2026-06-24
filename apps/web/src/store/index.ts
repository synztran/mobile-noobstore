import type {
	CartItem,
	Product,
	ProductVariant,
	SelectedComponent,
	ShippingDetails,
} from "@/lib/data";
import { create } from "zustand";
import { persist } from "zustand/middleware";
export { useDiscountStore } from "./useDiscount";

function generateId(): string {
	const globalCrypto = globalThis.crypto;

	if (typeof globalCrypto?.randomUUID === "function") {
		return globalCrypto.randomUUID();
	}

	if (typeof globalCrypto?.getRandomValues === "function") {
		const bytes = globalCrypto.getRandomValues(new Uint8Array(16));
		bytes[6] = (bytes[6] & 0x0f) | 0x40;
		bytes[8] = (bytes[8] & 0x3f) | 0x80;
		const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0"));
		return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex.slice(6, 8).join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10, 16).join("")}`;
	}

	return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

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
					const cartId = state.cartId ?? generateId();
					const isKit = (components?.length ?? 0) > 0;
					const existing = state.items.find((i) => {
						if (i.product.id !== product.id) return false;
						if (isKit) {
							const a = (i.components ?? []).map((c) => c.variant_id).sort().join(",");
							const b = (components ?? []).map((c) => c.variant_id).sort().join(",");
							return a === b;
						}
						return i.variant?.id === variant?.id;
					});
					if (existing) {
						return {
							cartId,
							items: state.items.map((i) => {
								if (i.product.id !== product.id) return i;
								if (isKit) {
									const a = (i.components ?? []).map((c) => c.variant_id).sort().join(",");
									const b = (components ?? []).map((c) => c.variant_id).sort().join(",");
									if (a !== b) return i;
								} else if (i.variant?.id !== variant?.id) {
									return i;
								}
								return { ...i, quantity: i.quantity + 1 };
							}),
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
