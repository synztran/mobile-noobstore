import { createQueryKeys } from "@lukemorales/query-key-factory";
// Types moved to modules/orders/types — re-exported here for backward compat.
export type { OrderStatusResult, OrderListFilters } from "@/modules/orders/types";

export const orderQueryKeys = createQueryKeys("order", {
	paymentInformation: null,
	status: (orderNumber: string | undefined) => [orderNumber ?? ""],
	list: (filters: import("@/modules/orders/types").OrderListFilters) => [filters],
	byNumber: (orderNumber: string) => [orderNumber],
	detail: (id: string) => [id],
});
