import type { CartItem, ShippingDetails } from "@/lib/data";
import { create } from "zustand";
import { persist } from "zustand/middleware";
export { useDiscountStore } from "./useDiscount";

// ─── CheckoutStore ───────────────────────────────────────────────────────────
// Still hosts the checkout domain state until checkout gets its own module
// pass (mirroring how useCartStore moved into modules/cart/client).

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
	idempotencyKey: string | null;
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
	getOrCreateIdempotencyKey: () => string;
	clearIdempotencyKey: () => void;
}

export const useCheckoutStore = create<CheckoutStore>()(
	persist(
		(set): CheckoutStore => ({
			idempotencyKey: null,
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
					idempotencyKey: null,
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
			getOrCreateIdempotencyKey: () => {
				let key = useCheckoutStore.getState().idempotencyKey;
				if (!key) {
					key = crypto.randomUUID();
					set({ idempotencyKey: key });
				}
				return key;
			},
			clearIdempotencyKey: () => set({ idempotencyKey: null }),
		}),
		{ name: "noobstore-checkout" },
	),
);
