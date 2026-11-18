"use client";

import BulkUpdateBar from "@/components/orders/BulkUpdateBar";
import OrderDetailModal, {
  type OrderDetail,
} from "@/components/orders/OrderDetailModal";
import EmptyState from "@/components/ui/EmptyState";
import ExportCSVButton from "@/components/ui/ExportCSVButton";
import TableCard from "@/components/ui/TableCard";
import type { ExportColumn } from "@/lib/csv";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCircle2, Clock, Info, RefreshCw, RotateCcw, Search, ShoppingCart, Wallet } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { getPaymentState, orderStatusLabel } from "@/lib/order-status";
import { formatVND } from "@/lib/currency";

interface Order {
	id: string;
	order_number: string;
	is_quick_order: boolean;
	status: string;
	total_price: number;
	created_at: string | null;
	cancelled_at?: string | null;
	cancelled_note?: string | null;
	payment_type: string;
	deposit_percentage: number | null;
	deposit_amount: number | null;
	remaining_amount: number | null;
	deposit_paid_at: string | null;
	paid_at: string | null;
	refunded_at: string | null;
	/** Resolved server-side from order_items + order_item_components. */
	has_pre_order: boolean;
	pre_order_count: number;
	order_items?: Array<{ count: number | null }> | null;
	order_services?: Array<{ count: number | null }> | null;
	users: { first_name: string | null; last_name: string | null } | null;
}

const STATUS_COLORS: Record<string, string> = {
	pending: "badge-pending",
	confirmed: "badge-confirmed",
	first_paid: "badge-confirmed",
	second_paid: "badge-delivering",
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
	hideTest: boolean;
}

const ORDER_TABLE_COLUMNS = ["Order #", "Customer", "Amount", "Status", "Payment", "Pre-order", "Date"];

/**
 * Total number of <td>s a body row renders: the select-all checkbox, one per
 * ORDER_TABLE_COLUMNS entry, and the trailing view button. The empty state and
 * the loading skeleton both key off this so they cannot drift out of alignment.
 */
const ORDER_TABLE_CELL_COUNT = ORDER_TABLE_COLUMNS.length + 2;

interface MarkerCell {
	icon: React.ReactNode;
	classes: string;
	title: string;
}

/**
 * Deposit marker for the Payment column.
 *
 * Returns null for a full-payment order — that is the common case and gets a
 * muted dash rather than an icon, so the amber/green markers actually stand out
 * when scanning for the orders that need attention.
 *
 * The state comes from getPaymentState(), the same function the order-detail
 * modal renders from, so the two can never report different payment states for
 * the same order.
 */
function getPaymentMarker(order: Order): MarkerCell | null {
	if (order.payment_type !== "deposit_cod") return null;

	const state = getPaymentState({
		paymentType: order.payment_type,
		paidAt: order.paid_at,
		refundedAt: order.refunded_at,
		depositPaidAt: order.deposit_paid_at,
	});

	const pctLabel = `${order.deposit_percentage ?? 0}%`;
	const deposit = formatVND(order.deposit_amount ?? 0);
	const cod = formatVND(order.remaining_amount ?? 0);

	switch (state) {
		case "refunded":
			return {
				icon: <RotateCcw className="h-4 w-4" />,
				classes: "text-slate-400",
				title: `Đã hoàn tiền — đặt cọc ${pctLabel} ${deposit}`,
			};
		case "paid":
			return {
				icon: <CheckCircle2 className="h-4 w-4" />,
				classes: "text-emerald-600",
				title: `Đã thanh toán đủ — đặt cọc ${deposit} + ${cod}`,
			};
		case "deposit_paid":
			return {
				icon: <CheckCircle2 className="h-4 w-4" />,
				classes: "text-emerald-600",
				title: `Đã đặt cọc ${pctLabel} — ${deposit} · COD ${cod}`,
			};
		default:
			return {
				icon: <Wallet className="h-4 w-4" />,
				classes: "text-amber-600",
				title: `Chờ đặt cọc ${pctLabel} — cần thu ${deposit} · COD ${cod}`,
			};
	}
}

function getPreOrderMarker(order: Order): MarkerCell | null {
	if (!order.has_pre_order) return null;
	const count = order.pre_order_count;
	return {
		icon: <Clock className="h-4 w-4" />,
		classes: "text-amber-600",
		title:
			count > 1
				? `Có ${count} mục đặt trước (pre-order)`
				: "Có sản phẩm đặt trước (pre-order)",
	};
}

/**
 * Renders a marker, or a muted dash when there is nothing to report.
 *
 * `emptyTitle` is per-column on purpose: the two columns mean opposite things,
 * so sharing one "nothing here" tooltip would put "Thanh toán đủ" on pre-order
 * rows that have no payment marker at all.
 */
function Marker({
  cell,
  emptyTitle,
}: {
  cell: MarkerCell | null;
  emptyTitle: string;
}) {
  if (!cell) {
    return (
      <span className="text-slate-300" title={emptyTitle}>
        —
      </span>
    );
  }
  return (
    <span className={`inline-flex ${cell.classes}`} title={cell.title}>
      {cell.icon}
    </span>
  );
}

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

async function fetchOrders(
	q: string,
	by: string,
	page: number,
	hideTest: boolean,
) {
	const params = new URLSearchParams();
	if (q) params.set("q", q);
	if (by !== "order") params.set("by", by);
	if (page > 1) params.set("page", String(page));
	if (hideTest) params.set("hideTest", "1");
	const res = await fetch(`/api/orders?${params.toString()}`);
	if (!res.ok) throw new Error("Failed to fetch orders");
	return res.json() as Promise<{
		orders: Order[];
		count: number;
		totalPages: number;
	}>;
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
	totalPages: initialTotalPages,
	currentPage,
	searchBy,
	q,
	hideTest,
}: Props) {
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
	const [quickOrderNumber, setQuickOrderNumber] = useState<string | null>(null);
	const showQuickOrderSuccess = quickOrderNumber !== null;

	useEffect(() => {
		const createdOrderNumber = searchParams.get("created");
		if (!createdOrderNumber) return;
		setQuickOrderNumber(createdOrderNumber);
		const params = new URLSearchParams(searchParams.toString());
		params.delete("created");
		startTransition(() =>
			router.replace(`${pathname}${params.size ? `?${params}` : ""}`),
		);
	}, [pathname, router, searchParams, startTransition]);

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
      {
        label: "Payment",
        accessor: (o) =>
          o.payment_type === "deposit_cod"
            ? `Deposit ${o.deposit_percentage ?? 0}%`
            : "Full",
      },
      {
        label: "Pre-order",
        accessor: (o) => (o.has_pre_order ? "Yes" : "No"),
      },
      { label: "Date", accessor: (o) => o.created_at ?? "" },
    ],
    [],
  );

  const queryClient = useQueryClient();
  const queryKey = ["orders", q, searchBy, currentPage, hideTest];

	const prevCountRef = useRef(initialCount ?? 0);

	const { data, isFetching, refetch } = useQuery({
		queryKey,
		queryFn: () => fetchOrders(q, searchBy, currentPage, hideTest),
		initialData: {
			orders: initialOrders,
			count: initialCount ?? 0,
			totalPages: initialTotalPages,
		},
		staleTime: 30_000,
		refetchInterval: 30_000,
	});

	const orders = data?.orders ?? [];
	const count = data?.count ?? 0;
	// Page size and total pages are computed server-side (see fetchOrdersList)
	// so this view can never disagree with the `range()` the query used.
	const totalPages = data?.totalPages ?? initialTotalPages;

	// Polling-based replacement for the old realtime subscription:
	// flag a badge when the total order count grows between polls.
	useEffect(() => {
		setNewOrderBadge((prev) => {
			if (prev) return true;
			return count > prevCountRef.current;
		});
		prevCountRef.current = count;
	}, [count]);

	function buildUrl(p: number) {
		const params = new URLSearchParams();
		if (q) params.set("q", q);
		if (searchBy !== "order") params.set("by", searchBy);
		if (p > 1) params.set("page", String(p));
		if (hideTest) params.set("hideTest", "1");
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

	const handleHideTest = useCallback(
		(next: boolean) => {
			const params = new URLSearchParams(searchParams.toString());
			if (next) params.set("hideTest", "1");
			else params.delete("hideTest");
			// The visible page can shift once rows disappear.
			params.delete("page");
			startTransition(() =>
				router.replace(`${pathname}?${params.toString()}`),
			);
		},
		[router, pathname, searchParams],
	);

	const handleRefresh = useCallback(() => {
		setNewOrderBadge(false);
		refetch();
	}, [refetch]);

	return (
		<>
			{showQuickOrderSuccess && (
				<div
					role="status"
					className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
				>
					Quick order {quickOrderNumber ? `#${quickOrderNumber} ` : ""}created successfully.
				</div>
			)}
			{/* Header */}
			<div className="flex flex-wrap items-center gap-4">
				<div className="mr-auto">
					<h1 className="text-xl font-semibold tracking-tight text-heading">
						Orders
					</h1>
					{isFetching && (
						<span className="text-xs text-muted animate-pulse">
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
				<Link
					href="/orders/quick"
					className="btn-primary h-9 shrink-0 px-3 py-0"
				>
					Quick order
				</Link>
				<button
					onClick={handleRefresh}
					className="btn-soft h-9 shrink-0 px-3 py-0"
					title="Re-fetch orders">
					<RefreshCw
						className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`}
					/>
					Refresh
				</button>
				<ExportCSVButton
					data={orders}
					columns={exportColumns}
					filename="orders"
				/>
				<div className="flex items-center overflow-hidden rounded-lg border border-[rgb(var(--admin-border))] bg-[rgb(var(--admin-surface))] focus-within:border-[rgb(var(--admin-accent))] focus-within:ring-2 focus-within:ring-[rgb(var(--admin-accent))]/40">
					<select
						defaultValue={searchBy}
						onChange={(e) => handleSearch(q, e.target.value)}
						className="border-r border-[rgb(var(--admin-border))] bg-transparent px-2.5 py-2 text-[13px] text-[rgb(var(--admin-text-secondary))] focus:outline-none">
						<option value="order">Order #</option>
						<option value="customer">Customer</option>
					</select>
					<div className="relative">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgb(var(--admin-text-muted))] pointer-events-none" />
						<input
							type="search"
							defaultValue={q}
							onChange={(e) => handleSearch(e.target.value)}
							placeholder={
								searchBy === "customer"
									? "Search by name…"
									: "Search by order #…"
							}
							className="pl-9 pr-4 py-2 text-[13px] w-56 bg-transparent text-[rgb(var(--admin-text))] placeholder:text-[rgb(var(--admin-text-muted))] focus:outline-none"
						/>
					</div>
				</div>

				{/* Hides orders placed with the signed-in staff member's own email
				    (see getCurrentAdminEmail). Purely a list filter — it never
				    changes or reclassifies an order. */}
				<label
					className="flex cursor-pointer items-center gap-2 text-[13px] text-[rgb(var(--admin-text-secondary))] select-none"
					title="Ẩn các đơn bạn tự đặt bằng email admin này — không phải đơn thật"
				>
					<input
						type="checkbox"
						className="toggle toggle-sm"
						checked={hideTest}
						disabled={isFetching}
						onChange={(e) => handleHideTest(e.target.checked)}
					/>
					<span>Ẩn đơn test</span>
					<Info
						className="h-3.5 w-3.5 text-[rgb(var(--admin-text-muted))]"
						aria-hidden
					/>
				</label>
			</div>

			{/* Table */}
			<TableCard>
				<table className="w-full">
<thead className="thead-bg border-b border-[rgb(var(--admin-border))]">
							<tr>
								<th className="w-10 px-4 py-2.5">
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
										className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted">
										{column}
									</th>
								))}
								<th className="px-4 py-2.5" />
							</tr>
						</thead>
					<tbody className="table-divide">
						{isFetching ? (
							<>
{[1, 2, 3, 4, 5].map((i) => (
								<tr key={i}>
									{Array.from({ length: ORDER_TABLE_CELL_COUNT }, (_, j) => (
										<td key={j} className="px-6 py-4">
											<div className="h-4 w-full animate-pulse rounded bg-slate-200 " />
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
									const paymentMarker = getPaymentMarker(order);
									const preOrderMarker = getPreOrderMarker(order);
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
										<td className="px-4 py-3 text-sm font-mono text-heading">
											<div className="flex items-center gap-2">
												<span
													className={`px-2 py-0.5 rounded text-xs font-medium ${ORDER_TYPE_COLORS[orderType.tone]}`}>
													{orderType.label}
												</span>
												{order.order_number}
											</div>
										</td>
										<td className="px-4 py-3 text-sm text-body">
											{customer}
										</td>
										<td className="px-4 py-3 text-sm font-medium text-heading">
											{order.total_price.toLocaleString(
												"vi-VN",
											)}
											₫
										</td>
										<td className="px-4 py-3 text-sm">
											{order.is_quick_order && (
												<span className="mr-2 rounded-full bg-blue-100 px-2 py-1 text-[10px] font-semibold text-blue-700">
													Quick
												</span>
											)}
											<span
												className={`px-3 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[order.status] ?? "badge-inactive"}`}
												title={
													order.status === "cancelled" && order.cancelled_note
														? order.cancelled_note
														: undefined
												}>
												{orderStatusLabel(order.status)}
											</span>
										</td>
										<td className="px-4 py-3 text-sm">
											<Marker
												cell={paymentMarker}
												emptyTitle="Thanh toán đủ một lần"
											/>
										</td>
										<td className="px-4 py-3 text-sm">
											<Marker
												cell={preOrderMarker}
												emptyTitle="Không có sản phẩm đặt trước"
											/>
										</td>
										<td className="px-4 py-3 text-sm text-body">
											{order.created_at
												? new Date(
														order.created_at,
													).toLocaleString("vi-VN")
												: "—"}
										</td>
										<td className="px-4 py-3 text-sm">
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
								<td colSpan={ORDER_TABLE_CELL_COUNT}>
									<EmptyState
										icon={ShoppingCart}
										title="No orders found"
										message="Orders placed by customers will appear here."
									/>
								</td>
							</tr>
						)}
					</tbody>
				</table>
			</TableCard>

			{/* Pagination */}
			{totalPages > 1 && (
				<div className="flex items-center justify-between pt-2">
					<span className="text-sm text-muted">
						{count} order{count !== 1 ? "s" : ""} · Page{" "}
						{currentPage} of {totalPages}
					</span>
					<div className="flex items-center gap-1">
						<Link
							href={buildUrl(currentPage - 1)}
							aria-disabled={currentPage === 1}
							className={`p-1.5 rounded-lg table-border text-body ${currentPage === 1 ? "pointer-events-none opacity-40" : "table-row-hover"}`}>
							‹
						</Link>
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
									<Link
										key={p}
										href={buildUrl(p)}
										className={`min-w-[2rem] h-8 flex items-center justify-center rounded-lg text-sm border ${p === currentPage ? "bg-blue-600 text-white border-blue-600 font-medium" : "table-border table-row-hover text-body"}`}>
										{p}
									</Link>
								),
							)}
						<Link
							href={buildUrl(currentPage + 1)}
							aria-disabled={currentPage === totalPages}
							className={`p-1.5 rounded-lg table-border text-body ${currentPage === totalPages ? "pointer-events-none opacity-40" : "table-row-hover"}`}>
							›
						</Link>
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
