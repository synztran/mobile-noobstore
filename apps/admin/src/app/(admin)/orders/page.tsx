import OrdersClient from "@/components/orders/OrdersClient";
import { getAdminClient } from "@/lib/supabase/admin";
import { Suspense } from "react";

export const metadata = { title: "Orders - NoobStore Admin" };

const PAGE_SIZE = 20;

interface Props {
	searchParams: Promise<{ q?: string; by?: string; page?: string }>;
}

export default async function OrdersPage({ searchParams }: Props) {
	const { q = "", by = "order", page } = await searchParams;
	const currentPage = Math.max(1, parseInt(page ?? "1", 10));
	const supabase = getAdminClient();

	let query = supabase
		.from("orders")
		.select(
			"id, order_number, status, total_price, created_at, users(first_name, last_name), order_items(count), order_services(count)",
			{
				count: "exact",
			},
		)
		.order("created_at", { ascending: false })
		.range((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE - 1);

	if (q) {
		if (by === "customer") {
			const { data: users } = await supabase
				.from("users")
				.select("id")
				.or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%`);
			const ids = (users ?? []).map((u) => u.id);
			if (ids.length > 0) {
				query = query.in("user_id", ids);
			} else {
				return (
					<div className="space-y-6">
						<Suspense>
							<OrdersClient
								orders={[]}
								count={0}
								currentPage={1}
								totalPages={1}
								searchBy={by}
								q={q}
							/>
						</Suspense>
					</div>
				);
			}
		} else {
			query = query.ilike("order_number", `%${q}%`);
		}
	}

	const { data: orders, count, error } = await query;

	if (error) {
		console.error("Error fetching orders:", error);
	}

	const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

	type OrderRow = NonNullable<typeof orders>[number];

	return (
		<div className="space-y-6">
			<Suspense>
				<OrdersClient
					orders={(orders ?? []) as OrderRow[]}
					count={count}
					currentPage={currentPage}
					totalPages={totalPages}
					searchBy={by}
					q={q}
				/>
			</Suspense>
		</div>
	);
}
