import { createQueryKeys } from "@lukemorales/query-key-factory";

export interface OrderStatusResult {
	status: string;
	voucher_discount_amount: number;
	shipping_discount_amount: number;
}

export interface OrderListFilters {
	q: string;
	status: string;
	page: number;
	limit: number;
}

export const orderQueryKeys = createQueryKeys("order", {
	paymentInformation: null,
	status: (orderNumber: string | undefined) => [orderNumber ?? ""],
	list: (filters: OrderListFilters) => [filters],
	byNumber: (orderNumber: string) => [orderNumber],
	detail: (id: string) => [id],
});
