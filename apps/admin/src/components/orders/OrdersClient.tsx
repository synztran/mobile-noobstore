"use client";

import BulkUpdateBar from "@/components/orders/BulkUpdateBar";
import OrderDetailModal, {
  type OrderDetail,
} from "@/components/orders/OrderDetailModal";
import ExportCSVButton from "@/components/ui/ExportCSVButton";
import type { ExportColumn } from "@/lib/csv";
import { createClient } from "@/lib/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";

interface Order {
	id: string;
	order_number: string;
	status: string;
	total_price: number;
	created_at: string | null;
	cancelled_at?: string | null;
	cancelled_note?: string | null;
	order_items?: Array<{ count: number | null }> | null;
	order_services?: Array<{ count: number | null }> | null;
	users: { first_name: string | null; last_name: string | null } | null;
}

const STATUS_COLORS: Record<string, string> = {
	pending: "badge-pending",
	confirmed: "badge-confirmed",
	shipped: "badge-delivering",
	delivering: "badge-delivering",
	delivered: "badge-delivered",
	cancelled: "badge-cancelled",
	refunded: "badge-cancelled",
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

async function fetchOrderDetail(id: string): Promise<OrderDetail> {
	const res = await fetch(`/api/orders/${id}`);
	const data = await res.json();
	if (data.error) throw new Error(data.error);
	return {
		...data,
		order_items: data.order_items ?? [],
		order_item_components: data.order_item_components ?? [],
		order_services: data.order_services ?? [],
		optionValueMap: data.optionValueMap ?? {},
		shippingMethodMap: data.shippingMethodMap ?? {},
	} as OrderDetail;
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
	const [prefetchedOrder, setPrefetchedOrder] = useState<OrderDetail | null>(
		null,
	);
	const [isDetailLoading, setIsDetailLoading] = useState<string | null>(null);
	const [newOrderBadge, setNewOrderBadge] = useState(false);
	const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const exportColumns: ExportColumn<Order>[] = useMemo(
    () => [
      { label: "Order #", accessor: (o) => o.order_number },
      {
        label: "Customer",
        accessor: (o) =>
          o.users
            ? `${o.users.first_name ?? ""} ${o.users.last_name ?? ""}`.trim()
            : "",
      },
      { label: "Amount", accessor: (o) => o.total_price },
      { label: "Status", accessor: (o) => o.status },
      { label: "Date", accessor: (o) => o.created_at ?? "" },
    ],
    [],
  );

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
					<h1 className="text-3xl font-bold text-heading">
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
				<ExportCSVButton
					data={orders}
					columns={exportColumns}
					filename="orders"
				/>
				<div className="input-base flex items-center rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500">
					<select
						defaultValue={searchBy}
						onChange={(e) => handleSearch(q, e.target.value)}
						className="border-r border-slate-300 bg-transparent text-sm px-2 py-2 focus:outline-none">
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
							className="pl-9 pr-4 py-2 text-sm w-56 focus:outline-none bg-transparent"
						/>
					</div>
				</div>
			</div>

			{/* Table */}
			<div className="card-bg card-border rounded-lg shadow overflow-hidden">
				<table className="w-full">
					<thead className="thead-bg table-border">
						<tr>
							<th className="w-10 px-4 py-3">
								<input
									type="checkbox"
									className="checkbox checkbox-sm"
									checked={
										selectedIds.length > 0 &&
										selectedIds.length === orders.length
									}
									onChange={() => {
										if (selectedIds.length === orders.length) {
											setSelectedIds([]);
										} else {
											setSelectedIds(
												orders.map((o) => o.id),
											);
										}
									}}
								/>
							</th>
							{ORDER_TABLE_COLUMNS.map((column) => (
								<th
									key={column}
									className="px-6 py-3 text-left text-sm font-semibold text-heading">
									{column}
								</th>
							))}
							<th className="px-6 py-3" />
						</tr>
					</thead>
					<tbody className="table-divide">
						{isFetching ? (
							<>
								{[1, 2, 3, 4, 5].map((i) => (
									<tr key={i}>
										{[1, 2, 3, 4, 5, 6].map((j) => (
											<td key={j} className="px-6 py-4">
												<div className="h-4 w-full animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
											</td>
										))}
									</tr>
								))}
							</>
						) : orders.length > 0 ? (
							orders.map((order) => {
								const customer = order.users
									? `${order.users.first_name ?? ""} ${order.users.last_name ?? ""}`.trim() ||
										"—"
									: "—";
								const orderType = getOrderType(order);
								return (
									<tr
										key={order.id}
										className="table-row-hover">
										<td className="px-4 py-4">
											<input
												type="checkbox"
												className="checkbox checkbox-sm"
												checked={selectedIds.includes(
													order.id,
												)}
												onChange={() => {
													setSelectedIds((prev) =>
														prev.includes(order.id)
															? prev.filter(
																	(id) =>
																		id !==
																		order.id,
																)
															: [...prev, order.id],
													);
												}}
											/>
										</td>
										<td className="px-6 py-4 text-sm font-mono text-heading">
											<div className="flex items-center gap-2">
												<span
													className={`px-2 py-0.5 rounded text-xs font-medium ${ORDER_TYPE_COLORS[orderType.tone]}`}>
													{orderType.label}
												</span>
												{order.order_number}
											</div>
										</td>
										<td className="px-6 py-4 text-sm text-body">
											{customer}
										</td>
										<td className="px-6 py-4 text-sm font-medium text-heading">
											{order.total_price.toLocaleString(
												"vi-VN",
											)}
											₫
										</td>
										<td className="px-6 py-4 text-sm">
											<span
												className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[order.status] ?? "badge-inactive"}`}
												title={
													order.status === "cancelled" && order.cancelled_note
														? order.cancelled_note
														: undefined
												}>
												{order.status}
											</span>
										</td>
										<td className="px-6 py-4 text-sm text-body">
											{order.created_at
												? new Date(
														order.created_at,
													).toLocaleString("vi-VN")
												: "—"}
										</td>
										<td className="px-6 py-4 text-sm">
											<button
												onClick={async () => {
													setIsDetailLoading(order.id);
													try {
														const detail =
															await fetchOrderDetail(
																order.id,
															);
														setPrefetchedOrder(
															detail,
														);
													} catch {
														console.error(
															"Failed to load order detail",
														);
													} finally {
														setIsDetailLoading(
															null,
														);
													}
												}}
												disabled={
													isDetailLoading ===
													order.id
												}
												className="btn-icon-edit w-8 h-8 rounded-full flex items-center justify-center disabled:opacity-50"
												title="View">
												{isDetailLoading ===
												order.id ? (
													<span className="loading loading-spinner loading-xs" />
												) : (
													<Search className="w-4 h-4" />
												)}
											</button>
										</td>
									</tr>
								);
							})
						) : (
							<tr>
								<td
									colSpan={7}
									className="px-6 py-8 text-center text-muted">
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
					<span className="text-sm text-muted">
						{count} order{count !== 1 ? "s" : ""} · Page{" "}
						{currentPage} of {totalPages}
					</span>
					<div className="flex items-center gap-1">
						<a
							href={buildUrl(currentPage - 1)}
							aria-disabled={currentPage === 1}
							className={`p-1.5 rounded-lg table-border text-body ${currentPage === 1 ? "pointer-events-none opacity-40" : "table-row-hover"}`}>
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
										className="px-2 text-muted text-sm">
										…
									</span>
								) : (
									<a
										key={p}
										href={buildUrl(p)}
										className={`min-w-[2rem] h-8 flex items-center justify-center rounded-lg text-sm border ${p === currentPage ? "bg-blue-600 text-white border-blue-600 font-medium" : "table-border table-row-hover text-body"}`}>
										{p}
									</a>
								),
							)}
						<a
							href={buildUrl(currentPage + 1)}
							aria-disabled={currentPage === totalPages}
							className={`p-1.5 rounded-lg table-border text-body ${currentPage === totalPages ? "pointer-events-none opacity-40" : "table-row-hover"}`}>
							›
						</a>
					</div>
				</div>
			)}

			<BulkUpdateBar
				selectedIds={selectedIds}
				onClear={() => setSelectedIds([])}
			/>

			<OrderDetailModal
				order={prefetchedOrder}
				onClose={() => setPrefetchedOrder(null)}
				onStatusUpdated={() => {
					if (prefetchedOrder) {
						fetchOrderDetail(prefetchedOrder.id).then(
							setPrefetchedOrder,
						);
					}
					queryClient.invalidateQueries({ queryKey: ["orders"] });
				}}
			/>
		</>
	);
}
