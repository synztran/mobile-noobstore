import { createQueryKeys } from "@lukemorales/query-key-factory";

export interface OrderStatusResult {
	status: string;
	voucher_discount_amount: number;
	shipping_discount_amount: number;
}

export const orderQueryKeys = createQueryKeys("order", {
	paymentInformation: null,
	status: (orderNumber: string | undefined) => [orderNumber ?? ""],
});
