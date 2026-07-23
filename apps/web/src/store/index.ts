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

interface CartStore {
	items: CartItem[];
	cartId: string | null;
	isOpen: boolean;
	isHydrated: boolean;

	setCart: (items: CartItem[], cartId: string | null) => void;
	setHydrated: (v: boolean) => void;
	addItem: (
		product: Product,
		variant: ProductVariant | null,
		components?: SelectedComponent[],
		gifts?: Array<{ gift_name: string; gift_slug: string; gift_thumbnail: string | null; quantity: number }>,
	) => void;
	addStandardProduct: (
		product: Product,
		variant: ProductVariant | null,
		gifts?: Array<{ gift_name: string; gift_slug: string; gift_thumbnail: string | null; quantity: number }>,
	) => { success: boolean; reason?: string };
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
			isHydrated: false,

			setCart: (items, cartId) => set({ items, cartId, isHydrated: true }),
			setHydrated: (v) => set({ isHydrated: v }),

			addItem: (product, variant, components, gifts) => {
				set((state) => {
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
					const isPreOrder = product.is_pre_order ?? components?.some((c) => c.is_pre_order) ?? false;
					const preOrderConfig = product.pre_order_config ?? components?.find((c) => c.pre_order_config)?.pre_order_config ?? null;
					if (existing) {
						return {
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
						items: [
							...state.items,
							{
								product,
								variant: variant ?? null,
								components: components ?? [],
								quantity: 1,
								gifts: gifts ?? undefined,
								is_pre_order: isPreOrder,
								pre_order_config: preOrderConfig,
							},
						],
					};
				});
			},

			addStandardProduct: (product, variant, gifts) => {
				const state = get();
				const existingItem = state.items.find(
					(i) =>
						i.product.id === product.id &&
						(i.variant?.id ?? null) === (variant?.id ?? null),
				);
				const currentQty = existingItem?.quantity ?? 0;
				if (!product.is_pre_order && currentQty + 1 > product.stock_quantity) {
					return {
						success: false,
						reason: `Sản phẩm này chỉ còn ${product.stock_quantity} trong kho`,
					};
				}
				state.addItem(product, variant, undefined, gifts);
				return { success: true };
			},

			removeItem: (productId, variantId) => {
				set((state) => ({
					items: state.items.filter(
						(i) =>
							!(i.product.id === productId && (i.variant?.id ?? null) === variantId),
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
								const maxQty = i.is_pre_order ? Infinity : i.product.stock_quantity;
								const newQty =
									delta > 0
										? Math.min(i.quantity + delta, maxQty)
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
					const basePrice = i.variant?.effective_price ?? i.product.base_price;
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
					return sum + (i.product.base_price + componentsTotal) * i.quantity;
				}, 0),

			itemCount: () =>
				get().items.reduce((sum, i) => sum + i.quantity, 0),
		}),
		{
			name: "noobstore-cart",
			skipHydration: true,
			partialize: (state) => ({
				items: state.items,
				cartId: state.cartId,
			}),
		},
	),
);

// ─── CheckoutStore ───────────────────────────────────────────────────────────

export interface ShippingFormDraft {
	fullName: string;
	apartment: string;
	phoneNumber: string;
	city: string;
	district: string;
	districtCode: string;
	ward: string;
	wardCode: string;
	streetAddress: string;
	notes: string;
}

interface CheckoutStore {
	shipping: ShippingDetails | null;
	shippingCost: number;
	orderId: string | null;
	orderNumber: string | null;
	totalPrice: number;
	orderedItems: CartItem[];
	shippingFormDraft: ShippingFormDraft | null;
	paymentType: "full" | "deposit_cod";
	depositPercentage: number;
	setShipping: (data: ShippingDetails, cost: number) => void;
	setOrder: (
		id: string,
		orderNumber: string,
		totalPrice: number,
		orderedItems: CartItem[],
	) => void;
	saveShippingDraft: (draft: ShippingFormDraft) => void;
	clearShippingDraft: () => void;
	setPaymentType: (type: "full" | "deposit_cod") => void;
	setDepositPercentage: (pct: number) => void;
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
			shippingFormDraft: null,
			paymentType: "full",
			depositPercentage: 50,
			setShipping: (data, cost) =>
				set({ shipping: data, shippingCost: cost }),
			setOrder: (id, orderNumber, totalPrice, orderedItems) =>
				set({ orderId: id, orderNumber, totalPrice, orderedItems }),
			saveShippingDraft: (draft) =>
				set({ shippingFormDraft: draft }),
			clearShippingDraft: () =>
				set({ shippingFormDraft: null }),
			setPaymentType: (type) =>
				set({ paymentType: type }),
			setDepositPercentage: (pct) =>
				set({ depositPercentage: pct }),
			clearCheckout: () =>
				set({
					shipping: null,
					shippingCost: 0,
					orderId: null,
					orderNumber: null,
					totalPrice: 0,
					orderedItems: [],
					shippingFormDraft: null,
					paymentType: "full",
					depositPercentage: 50,
				}),
		}),
		{ name: "noobstore-checkout" },
	),
);
