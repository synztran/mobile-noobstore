"use client";

import OrderDetailModal from "@/components/orders/OrderDetailModal";
import { createClient } from "@/lib/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";

interface Order {
	id: string;
	order_number: string;
	status: string;
	total_price: number;
	created_at: string | null;
	order_items?: Array<{ count: number | null }> | null;
	order_services?: Array<{ count: number | null }> | null;
	users: { first_name: string | null; last_name: string | null } | null;
}

const STATUS_COLORS: Record<string, string> = {
	pending: "bg-yellow-100 text-yellow-800",
	confirmed: "bg-blue-100 text-blue-800",
	shipped: "bg-purple-100 text-purple-800",
	delivered: "bg-green-100 text-green-800",
	cancelled: "bg-red-100 text-red-800",
};

const ORDER_TYPE_COLORS: Record<string, string> = {
	product: "bg-slate-100 text-slate-700",
	service: "bg-orange-100 text-orange-700",
	mixed: "bg-indigo-100 text-indigo-700",
	unknown: "bg-slate-100 text-slate-500",
};

interface Props {
	orders: Order[];
	count: number | null;
	currentPage: number;
	totalPages: number;
	searchBy: string;
	q: string;
}

const ORDER_TABLE_COLUMNS = ["Order #", "Customer", "Amount", "Status", "Date"];

function getOrderType(order: Order) {
	const productCount = order.order_items?.[0]?.count ?? 0;
	const serviceCount = order.order_services?.[0]?.count ?? 0;

	if (productCount > 0 && serviceCount > 0) {
		return { label: "M", tone: "mixed" } as const;
	}

	if (serviceCount > 0) {
		return { label: "S", tone: "service" } as const;
	}

	if (productCount > 0) {
		return { label: "P", tone: "product" } as const;
	}

	return { label: "U", tone: "unknown" } as const;
}

async function fetchOrders(q: string, by: string, page: number) {
	const params = new URLSearchParams();
	if (q) params.set("q", q);
	if (by !== "order") params.set("by", by);
	if (page > 1) params.set("page", String(page));
	const res = await fetch(`/api/orders?${params.toString()}`);
	if (!res.ok) throw new Error("Failed to fetch orders");
	return res.json() as Promise<{ orders: Order[]; count: number }>;
}

export default function OrdersClient({
	orders: initialOrders,
	count: initialCount,
	currentPage,
	searchBy,
	q,
}: Props) {
	const PAGE_SIZE = 20;
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const [, startTransition] = useTransition();
	const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
	const [newOrderBadge, setNewOrderBadge] = useState(false);

	const queryClient = useQueryClient();
	const queryKey = ["orders", q, searchBy, currentPage];

	const { data, isFetching } = useQuery({
		queryKey,
		queryFn: () => fetchOrders(q, searchBy, currentPage),
		initialData: { orders: initialOrders, count: initialCount ?? 0 },
		staleTime: 30_000,
	});

	const orders = data?.orders ?? [];
	const count = data?.count ?? 0;
	const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));

	// Supabase realtime subscription
	useEffect(() => {
		const supabase = createClient();
		const channel = supabase
			.channel("orders-realtime")
			.on(
				"postgres_changes",
				{ event: "*", schema: "public", table: "orders" },
				() => {
					queryClient.invalidateQueries({ queryKey });
					setNewOrderBadge(true);
				},
			)
			.subscribe();
		return () => {
			supabase.removeChannel(channel);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [queryClient, q, searchBy, currentPage]);

	function buildUrl(p: number) {
		const params = new URLSearchParams();
		if (q) params.set("q", q);
		if (searchBy !== "order") params.set("by", searchBy);
		if (p > 1) params.set("page", String(p));
		const qs = params.toString();
		return `/orders${qs ? `?${qs}` : ""}`;
	}

	const handleSearch = useCallback(
		(value: string, by?: string) => {
			const params = new URLSearchParams(searchParams.toString());
			if (value) params.set("q", value);
			else params.delete("q");
			params.set("by", by ?? searchBy);
			params.delete("page");
			startTransition(() =>
				router.replace(`${pathname}?${params.toString()}`),
			);
		},
		[router, pathname, searchParams, searchBy],
	);

	return (
		<>
			{/* Header */}
			<div className="flex items-center gap-4">
				<div className="flex items-center gap-3 mr-auto">
					<h1 className="text-3xl font-bold text-slate-900">
						Orders
					</h1>
					{isFetching && (
						<span className="text-xs text-slate-400 animate-pulse">
							Refreshing…
						</span>
					)}
					{newOrderBadge && !isFetching && (
						<button
							onClick={() => setNewOrderBadge(false)}
							className="flex items-center gap-1.5 text-xs bg-blue-50 border border-blue-200 text-blue-700 px-2.5 py-1 rounded-full hover:bg-blue-100 transition-colors">
							<Bell className="w-3.5 h-3.5" />
							New orders received
						</button>
					)}
				</div>
				<div className="flex items-center border border-slate-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500">
					<select
						defaultValue={searchBy}
						onChange={(e) => handleSearch(q, e.target.value)}
						className="border-r border-slate-300 bg-slate-50 text-sm text-slate-600 px-2 py-2 focus:outline-none">
						<option value="order">Order #</option>
						<option value="customer">Customer</option>
					</select>
					<div className="relative">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
						<input
							type="search"
							defaultValue={q}
							onChange={(e) => handleSearch(e.target.value)}
							placeholder={
								searchBy === "customer"
									? "Search by name…"
									: "Search by order #…"
							}
							className="pl-9 pr-4 py-2 text-sm w-56 focus:outline-none"
						/>
					</div>
				</div>
			</div>

			{/* Table */}
			<div
				className={`bg-white rounded-lg shadow overflow-hidden transition-opacity ${isFetching ? "opacity-60" : "opacity-100"}`}>
				<table className="w-full">
					<thead className="bg-slate-50 border-b border-slate-200">
						<tr>
							{ORDER_TABLE_COLUMNS.map((column) => (
								<th
									key={column}
									className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
									{column}
								</th>
							))}
							<th className="px-6 py-3" />
						</tr>
					</thead>
					<tbody className="divide-y divide-slate-200">
						{orders.length > 0 ? (
							orders.map((order) => {
								const customer = order.users
									? `${order.users.first_name ?? ""} ${order.users.last_name ?? ""}`.trim() ||
										"—"
									: "—";
								const orderType = getOrderType(order);
								return (
									<tr
										key={order.id}
										className="hover:bg-slate-50">
										<td className="px-6 py-4 text-sm font-mono text-slate-900">
											<div className="flex items-center gap-2">
												<span
													className={`px-2 py-0.5 rounded text-xs font-medium ${ORDER_TYPE_COLORS[orderType.tone]}`}>
													{orderType.label}
												</span>
												{order.order_number}
											</div>
										</td>
										<td className="px-6 py-4 text-sm text-slate-600">
											{customer}
										</td>
										<td className="px-6 py-4 text-sm font-medium text-slate-900">
											{order.total_price.toLocaleString(
												"vi-VN",
											)}
											₫
										</td>
										<td className="px-6 py-4 text-sm">
											<span
												className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[order.status] ?? "bg-slate-100 text-slate-700"}`}>
												{order.status}
											</span>
										</td>
										<td className="px-6 py-4 text-sm text-slate-600">
											{order.created_at
												? new Date(
														order.created_at,
													).toLocaleString("vi-VN")
												: "—"}
										</td>
										<td className="px-6 py-4 text-sm">
											<button
												onClick={() =>
													setActiveOrderId(order.id)
												}
												className="text-blue-600 hover:text-blue-800 font-medium">
												View
											</button>
										</td>
									</tr>
								);
							})
						) : (
							<tr>
								<td
									colSpan={6}
									className="px-6 py-8 text-center text-slate-500">
									No orders found
								</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>

			{/* Pagination */}
			{totalPages > 1 && (
				<div className="flex items-center justify-between pt-2">
					<span className="text-sm text-slate-500">
						{count} order{count !== 1 ? "s" : ""} · Page{" "}
						{currentPage} of {totalPages}
					</span>
					<div className="flex items-center gap-1">
						<a
							href={buildUrl(currentPage - 1)}
							aria-disabled={currentPage === 1}
							className={`p-1.5 rounded-lg border border-slate-200 text-slate-600 ${currentPage === 1 ? "pointer-events-none opacity-40" : "hover:bg-slate-100"}`}>
							‹
						</a>
						{Array.from({ length: totalPages }, (_, i) => i + 1)
							.filter(
								(p) =>
									p === 1 ||
									p === totalPages ||
									Math.abs(p - currentPage) <= 1,
							)
							.reduce<(number | "…")[]>((acc, p, idx, arr) => {
								if (idx > 0 && p - (arr[idx - 1] as number) > 1)
									acc.push("…");
								acc.push(p);
								return acc;
							}, [])
							.map((p, i) =>
								p === "…" ? (
									<span
										key={`e-${i}`}
										className="px-2 text-slate-400 text-sm">
										…
									</span>
								) : (
									<a
										key={p}
										href={buildUrl(p)}
										className={`min-w-[2rem] h-8 flex items-center justify-center rounded-lg text-sm border ${p === currentPage ? "bg-blue-600 text-white border-blue-600 font-medium" : "border-slate-200 hover:bg-slate-100"}`}>
										{p}
									</a>
								),
							)}
						<a
							href={buildUrl(currentPage + 1)}
							aria-disabled={currentPage === totalPages}
							className={`p-1.5 rounded-lg border border-slate-200 text-slate-600 ${currentPage === totalPages ? "pointer-events-none opacity-40" : "hover:bg-slate-100"}`}>
							›
						</a>
					</div>
				</div>
			)}

			<OrderDetailModal
				orderId={activeOrderId}
				onClose={() => setActiveOrderId(null)}
				onStatusUpdated={() =>
					queryClient.invalidateQueries({ queryKey: ["orders"] })
				}
			/>
		</>
	);
}
