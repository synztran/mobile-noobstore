"use client";

import type { OrderSummary } from "@/app/api/user/orders/route";
import { OrderDetailDrawer } from "@/components/orders/OrderDetailDrawer";
import OrderStatusTabs, {
	type OrderStatusTabOption,
} from "@/components/orders/OrderStatusTabs";
import { ServiceOrderDetailDrawer } from "@/components/orders/ServiceOrderDetailDrawer";
import { useAuth } from "@/lib/auth/AuthProvider";
import { formatVND } from "@/lib/currency";
import {
	ArrowLeft,
	CheckCircle2,
	CircleX,
	HourglassIcon,
	Loader2,
	PackageCheck,
	ReceiptText,
	Search,
	Truck,
	X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

const STATUS_CONFIG: Record<
	string,
	{
		label: string;
		Icon: React.ElementType;
		color: string;
		bg: string;
	}
> = {
	pending: {
		label: "Chờ xác nhận",
		Icon: HourglassIcon,
		color: "text-amber-600",
		bg: "bg-amber-50",
	},
	paid: {
		label: "Đã thanh toán",
		Icon: CheckCircle2,
		color: "text-emerald-600",
		bg: "bg-emerald-50",
	},
	confirmed: {
		label: "Đã xác nhận",
		Icon: CheckCircle2,
		color: "text-emerald-600",
		bg: "bg-emerald-50",
	},
	preparing: {
		label: "Đang chuẩn bị",
		Icon: PackageCheck,
		color: "text-sky-700",
		bg: "bg-sky-50",
	},
	shipped: {
		label: "Đang vận chuyển",
		Icon: Truck,
		color: "text-blue-600",
		bg: "bg-blue-50",
	},
	delivering: {
		label: "Đang giao",
		Icon: Truck,
		color: "text-blue-600",
		bg: "bg-blue-50",
	},
	delivered: {
		label: "Đã giao hàng",
		Icon: PackageCheck,
		color: "text-primary",
		bg: "bg-primary/5",
	},
	cancelled: {
		label: "Đã hủy",
		Icon: CircleX,
		color: "text-error",
		bg: "bg-error/5",
	},
};

const STATUS_TABS: OrderStatusTabOption[] = [
	{ value: "all", label: "Tất cả" },
	{ value: "pending", label: "Chờ xác nhận" },
	{ value: "confirmed", label: "Đã xác nhận" },
	{ value: "delivering", label: "Đang giao" },
	{ value: "delivered", label: "Đã giao" },
	{ value: "cancelled", label: "Đã hủy" },
];

function StatusBadge({ status }: { status: string }) {
	const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
	return (
		<span
			className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${cfg.bg} ${cfg.color}`}>
			<cfg.Icon size={10} />
			{cfg.label}
		</span>
	);
}

function OrderSkeleton() {
	return (
		<div className="animate-pulse space-y-3">
			{[1, 2, 3].map((i) => (
				<div
					key={i}
					className="bg-surface-container rounded-3xl p-4 space-y-3">
					<div className="flex justify-between">
						<div className="h-4 w-28 bg-surface-container-high rounded-full" />
						<div className="h-4 w-20 bg-surface-container-high rounded-full" />
					</div>
					<div className="h-3 w-40 bg-surface-container-high rounded-full" />
					<div className="flex justify-between">
						<div className="h-3 w-24 bg-surface-container-high rounded-full" />
						<div className="h-3 w-16 bg-surface-container-high rounded-full" />
					</div>
				</div>
			))}
		</div>
	);
}

function LoadMoreSkeleton() {
	return (
		<div className="space-y-3">
			{[1, 2].map((i) => (
				<div
					key={i}
					className="animate-pulse bg-surface-container rounded-3xl p-4 space-y-3">
					<div className="flex justify-between">
						<div className="h-4 w-28 bg-surface-container-high rounded-full" />
						<div className="h-4 w-20 bg-surface-container-high rounded-full" />
					</div>
					<div className="h-3 w-40 bg-surface-container-high rounded-full" />
					<div className="flex justify-between">
						<div className="h-3 w-24 bg-surface-container-high rounded-full" />
						<div className="h-3 w-16 bg-surface-container-high rounded-full" />
					</div>
				</div>
			))}
		</div>
	);
}

export default function OrdersPage() {
	const { user, loading: authLoading } = useAuth();
	const router = useRouter();

	const [orders, setOrders] = useState<OrderSummary[]>([]);
	const [total, setTotal] = useState(0);
	const [statusCounts, setStatusCounts] = useState<Record<string, number>>(
		{},
	);
	const [page, setPage] = useState(1);
	const [hasNextPage, setHasNextPage] = useState(false);
	const [loading, setLoading] = useState(true);
	const [loadingMore, setLoadingMore] = useState(false);
	const [q, setQ] = useState("");
	const [debouncedQ, setDebouncedQ] = useState("");
	const [activeStatus, setActiveStatus] = useState("all");
	const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
	const [selectedServiceOrderId, setSelectedServiceOrderId] = useState<
		string | null
	>(null);
	const loadMoreTriggerRef = useRef<HTMLDivElement | null>(null);
	const inFlightRef = useRef(false);

	// Debounce search
	useEffect(() => {
		const t = setTimeout(() => setDebouncedQ(q), 350);
		return () => clearTimeout(t);
	}, [q]);

	const fetchOrders = useCallback(
		async ({
			search,
			status,
			nextPage,
			append,
		}: {
			search: string;
			status: string;
			nextPage: number;
			append: boolean;
		}) => {
			if (inFlightRef.current) return;
			inFlightRef.current = true;

			if (append) {
				setLoadingMore(true);
			} else {
				setLoading(true);
			}
			try {
				const params = new URLSearchParams();
				if (search) params.set("q", search);
				if (status !== "all") params.set("status", status);
				params.set("page", String(nextPage));
				params.set("limit", "10");
				const res = await fetch(`/api/user/orders?${params}`);
				if (res.status === 401) {
					router.push("/login");
					return;
				}
				if (!res.ok) return;
				const data = await res.json();
				setOrders((prev) =>
					append
						? [...prev, ...(data.orders as OrderSummary[])]
						: (data.orders as OrderSummary[]),
				);
				setTotal(data.total);
				setPage(data.pagination?.page ?? nextPage);
				setHasNextPage(Boolean(data.pagination?.has_next_page));
				if (!append && data.status_counts) {
					setStatusCounts(
						data.status_counts as Record<string, number>,
					);
				}
			} finally {
				if (append) {
					setLoadingMore(false);
				} else {
					setLoading(false);
				}
				inFlightRef.current = false;
			}
		},
		[router],
	);

	useEffect(() => {
		if (!authLoading && !user) {
			router.push("/login");
		}
	}, [authLoading, user, router]);

	useEffect(() => {
		if (!authLoading && user) {
			setPage(1);
			setHasNextPage(false);
			fetchOrders({
				search: debouncedQ,
				status: activeStatus,
				nextPage: 1,
				append: false,
			});
		}
	}, [authLoading, user, debouncedQ, activeStatus, fetchOrders]);

	useEffect(() => {
		const target = loadMoreTriggerRef.current;
		if (!target || loading || loadingMore || !hasNextPage) {
			return;
		}

		const observer = new IntersectionObserver(
			(entries) => {
				const first = entries[0];
				if (!first.isIntersecting || inFlightRef.current) return;
				fetchOrders({
					search: debouncedQ,
					status: activeStatus,
					nextPage: page + 1,
					append: true,
				});
			},
			{ rootMargin: "180px 0px" },
		);

		observer.observe(target);
		return () => observer.disconnect();
	}, [
		activeStatus,
		debouncedQ,
		fetchOrders,
		hasNextPage,
		loading,
		loadingMore,
		page,
	]);

	return (
		<div className="px-4 pt-2 pb-24 space-y-5">
			{/* Header */}
			<div className="flex items-center gap-3 mb-2">
				<Link
					href="/profile"
					className="w-9 h-9 rounded-xl bg-surface-container flex items-center justify-center active:scale-90 transition-transform">
					<ArrowLeft size={18} className="text-on-surface" />
				</Link>
				<div>
					<h1 className="text-xl font-black text-on-surface tracking-tight">
						Đơn hàng của tôi
					</h1>
					{!loading ? (
						<p className="text-xs text-on-surface-variant">
							{total} đơn hàng
						</p>
					) : (
						<div className="h-3 w-16 bg-surface-container-high rounded-full mt-1" />
					)}
				</div>
			</div>

			{/* Search */}
			<div className="flex items-center gap-3 bg-surface-container rounded-2xl px-4 py-3 border-2 border-transparent focus-within:border-primary transition-all">
				<Search
					size={18}
					className="text-outline-variant flex-shrink-0"
				/>
				<input
					type="text"
					placeholder="Tìm theo mã đơn, mã giao dịch..."
					value={q}
					onChange={(e) => setQ(e.target.value)}
					className="flex-1 bg-transparent outline-none text-on-surface placeholder:text-on-surface-variant/40 font-medium text-sm"
				/>
				{q && (
					<button onClick={() => setQ("")}>
						<X size={18} className="text-outline-variant" />
					</button>
				)}
			</div>

			<OrderStatusTabs
				value={activeStatus}
				onChange={setActiveStatus}
				options={STATUS_TABS.map((tab) => ({
					...tab,
					count: statusCounts[tab.value] ?? 0,
				}))}
			/>

			{/* List */}
			{loading || authLoading ? (
				<OrderSkeleton />
			) : orders.length === 0 ? (
				<div className="flex flex-col items-center justify-center py-20 gap-4">
					<div className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center">
						<ReceiptText
							size={28}
							className="text-outline-variant"
						/>
					</div>
					<p className="text-on-surface-variant font-semibold text-sm">
						{q || activeStatus !== "all"
							? "Không tìm thấy đơn hàng"
							: "Chưa có đơn hàng nào"}
					</p>
				</div>
			) : (
				<div className="space-y-3">
					{orders.map((order) => (
						<button
							key={order.id}
							onClick={() =>
								order.service_line_count > 0 &&
								order.item_count === 0
									? setSelectedServiceOrderId(order.id)
									: setSelectedOrderId(order.id)
							}
							className="w-full text-left bg-surface-container-lowest rounded-3xl p-4 space-y-3 shadow-ambient-sm active:scale-[0.99] transition-transform">
							{/* Row 1: order number + status */}
							<div className="flex items-center justify-between gap-2">
								<div className="flex flex-col gap-2">
									<div className="flex items-center gap-2">
										<span className="font-black text-primary tracking-widest text-sm">
											{order.order_number ??
												`#${order.id}`}
										</span>
										<StatusBadge status={order.status} />
									</div>
									<span className="text-xs text-on-surface-variant">
										{new Date(
											order.created_at,
										).toLocaleDateString("vi-VN", {
											day: "2-digit",
											month: "2-digit",
											year: "2-digit",
											hour: "2-digit",
											minute: "2-digit",
										})}
									</span>
								</div>
							</div>

							{/* Row 2: items count + total */}
							<div className="flex items-center justify-between">
								<span className="text-xs text-on-surface-variant font-medium">
									{order.item_count} sản phẩm
								</span>
								<span className="font-black text-on-surface text-base">
									{formatVND(order.total_price)}
								</span>
							</div>
						</button>
					))}

					{loadingMore ? <LoadMoreSkeleton /> : null}

					<div
						ref={loadMoreTriggerRef}
						aria-hidden="true"
						className="h-2"
					/>

					{hasNextPage && !loadingMore ? (
						<div className="flex items-center justify-center py-2 text-xs text-on-surface-variant">
							<Loader2 size={14} className="animate-spin mr-2" />
							Đang tải thêm đơn hàng...
						</div>
					) : null}
				</div>
			)}

			<OrderDetailDrawer
				orderId={selectedOrderId}
				onClose={() => setSelectedOrderId(null)}
			/>
			<ServiceOrderDetailDrawer
				orderId={selectedServiceOrderId}
				onClose={() => setSelectedServiceOrderId(null)}
			/>
		</div>
	);
}
