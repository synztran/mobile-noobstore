import { fetchOrdersList } from "@/lib/orders-list-query";
import OrdersClient from "@/components/orders/OrdersClient";
import { Suspense } from "react";

export const metadata = { title: "Orders - NoobStore Admin" };

interface Props {
	searchParams: Promise<{ q?: string; by?: string; page?: string; hideTest?: string }>;
}

export default async function OrdersPage({ searchParams }: Props) {
	const { q = "", by = "order", page, hideTest } = await searchParams;
	const currentPage = Math.max(1, parseInt(page ?? "1", 10));
	const hideTestOrders = hideTest === "1";

	const result = await fetchOrdersList({
		q,
		by,
		page: currentPage,
		hideTest: hideTestOrders,
	});

	const client = (
		orders: Parameters<typeof OrdersClient>[0]["orders"],
		count: number | null,
		totalPages: number,
	) => (
		<div className="space-y-6">
			<Suspense>
				<OrdersClient
					orders={orders}
					count={count}
					currentPage={currentPage}
					totalPages={totalPages}
					searchBy={by}
					q={q}
					hideTest={hideTestOrders}
				/>
			</Suspense>
		</div>
	);

	// A customer search that matched no user has nothing to page through.
	if (!result.ok) {
		return client([], 0, 1);
	}

	if (result.error) {
		// Non-fatal: the page still renders, matching the previous behaviour.
		console.error("Error fetching orders:", result.error);
	}

	return client(result.orders, result.count, result.totalPages);
}
