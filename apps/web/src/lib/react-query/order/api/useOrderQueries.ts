import type { PaymentInformation } from "@/lib/payment-information";
import { appQueryKeys } from "@/lib/react-query/root";
import type { OrderStatusResult } from "@/lib/react-query/router/order";
import { useQuery } from "@tanstack/react-query";

export function usePaymentInformation(enabled = true) {
	return useQuery<PaymentInformation[]>({
		...appQueryKeys.order.paymentInformation,
		enabled,
		queryFn: async () => {
			const res = await fetch("/api/payment-information");
			if (!res.ok) throw new Error("Failed to load payment info");
			const data = (await res.json()) as {
				methods?: PaymentInformation[];
			};
			return data.methods ?? [];
		},
	});
}

export function useOrderStatus(
	orderNumber: string | null | undefined,
	enabled = true,
	refetchInterval?: number | false,
) {
	return useQuery<OrderStatusResult>({
		...appQueryKeys.order.status(orderNumber ?? undefined),
		enabled: enabled && !!orderNumber,
		refetchInterval: refetchInterval ?? false,
		queryFn: async () => {
			const res = await fetch(`/api/orders/${orderNumber}`, {
				method: "GET",
			});
			if (!res.ok) {
				return {
					status: "",
					voucher_discount_amount: 0,
					shipping_discount_amount: 0,
				};
			}
			const data = await res.json();
			return {
				status: (data.status as string) ?? "pending",
				voucher_discount_amount:
					Number(data.voucher_discount_amount ?? 0) || 0,
				shipping_discount_amount:
					Number(data.shipping_discount_amount ?? 0) || 0,
			};
		},
	});
}
