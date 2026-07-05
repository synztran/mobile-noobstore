import type { OrderDetail } from "@/app/api/user/orders/[id]/route";
import type { OrderSummary } from "@/app/api/user/orders/route";
import type { PaymentInformation } from "@/lib/payment-information";
import { appQueryKeys } from "@/lib/react-query/root";
import type { OrderListFilters, OrderStatusResult } from "@/lib/react-query/router/order";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";

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

type OrderListPage = {
	orders: OrderSummary[];
	total: number;
	status_counts: Record<string, number>;
	pagination: { page: number; has_next_page: boolean };
};

export function useOrders({ q, status }: { q: string; status: string }) {
	return useInfiniteQuery<OrderListPage>({
		queryKey: ["orders", "list", { q, status }],
		queryFn: async ({ pageParam }) => {
			const params = new URLSearchParams();
			if (q) params.set("q", q);
			if (status !== "all") params.set("status", status);
			params.set("page", String(pageParam));
			params.set("limit", "10");
			const res = await fetch(`/api/user/orders?${params}`);
			if (res.status === 401) throw new Error("Unauthorized");
			return res.json();
		},
		initialPageParam: 1,
		getNextPageParam: (lastPage) =>
			lastPage.pagination?.has_next_page
				? lastPage.pagination.page + 1
				: undefined,
	});
}

export function useOrderDetail(id: string | null) {
	return useQuery<OrderDetail | null>({
		...appQueryKeys.order.detail(id ?? ""),
		enabled: !!id,
		queryFn: async () => {
			const res = await fetch(`/api/user/orders/${id}`);
			if (!res.ok) return null;
			const data = await res.json();
			return data?.error ? null : data;
		},
	});
}

export function useOrderByNumber(orderNumber: string | null) {
	return useQuery<OrderSummary | null>({
		...appQueryKeys.order.byNumber(orderNumber ?? ""),
		enabled: !!orderNumber,
		queryFn: async () => {
			const res = await fetch(
				`/api/user/orders?q=${encodeURIComponent(orderNumber!)}&limit=10`,
			);
			if (!res.ok) return null;
			const data = await res.json();
			return (
				((data.orders as OrderSummary[]) ?? []).find(
					(o) => o.order_number === orderNumber,
				) ?? null
			);
		},
	});
}
