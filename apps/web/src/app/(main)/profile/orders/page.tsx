"use client";

import type { OrderSummary } from "@/app/api/user/orders/route";
import { OrderDetailDrawer } from "@/components/orders/OrderDetailDrawer";
import OrderStatusTabs, {
  type OrderStatusTabOption,
} from "@/components/orders/OrderStatusTabs";
import { ServiceOrderDetailDrawer } from "@/components/orders/ServiceOrderDetailDrawer";
import { useAuth } from "@/lib/auth/AuthProvider";
import { withAuthRedirect } from "@/components/auth/withAuthRedirect";
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
    color: "text-emerald-600",
    bg: "bg-emerald-50",
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
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${cfg.bg} ${cfg.color}`}
    >
      <cfg.Icon size={10} />
      {cfg.label}
    </span>
  );
}

function OrderSkeleton() {
  return (
    <div className="animate-pulse space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="space-y-3 rounded-3xl bg-surface-container p-4">
          <div className="flex justify-between">
            <div className="h-4 w-28 rounded-full bg-surface-container-high" />
            <div className="h-4 w-20 rounded-full bg-surface-container-high" />
          </div>
          <div className="h-3 w-40 rounded-full bg-surface-container-high" />
          <div className="flex justify-between">
            <div className="h-3 w-24 rounded-full bg-surface-container-high" />
            <div className="h-3 w-16 rounded-full bg-surface-container-high" />
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
          className="animate-pulse space-y-3 rounded-3xl bg-surface-container p-4"
        >
          <div className="flex justify-between">
            <div className="h-4 w-28 rounded-full bg-surface-container-high" />
            <div className="h-4 w-20 rounded-full bg-surface-container-high" />
          </div>
          <div className="h-3 w-40 rounded-full bg-surface-container-high" />
          <div className="flex justify-between">
            <div className="h-3 w-24 rounded-full bg-surface-container-high" />
            <div className="h-3 w-16 rounded-full bg-surface-container-high" />
          </div>
        </div>
      ))}
    </div>
  );
}

function OrdersPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
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
            : (data.orders as OrderSummary[])
        );
        setTotal(data.total);
        setPage(data.pagination?.page ?? nextPage);
        setHasNextPage(Boolean(data.pagination?.has_next_page));
        if (!append && data.status_counts) {
          setStatusCounts(data.status_counts as Record<string, number>);
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
    [router]
  );

  // auth redirect handled by withAuthRedirect HOC

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
      { rootMargin: "180px 0px" }
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
    <div className="space-y-5 px-4 pb-24 pt-2">
      {/* Header */}
      <div className="mb-2 flex items-center gap-3">
        <Link
          href="/profile"
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface-container transition-transform active:scale-90"
        >
          <ArrowLeft size={18} className="text-on-surface" />
        </Link>
        <div>
          <h1 className="text-xl font-black tracking-tight text-on-surface">
            Đơn hàng của tôi
          </h1>
          {!loading ? (
            <p className="text-xs text-on-surface-variant">{total} đơn hàng</p>
          ) : (
            <div className="mt-1 h-3 w-16 rounded-full bg-surface-container-high" />
          )}
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-3 rounded-2xl border-2 border-transparent bg-surface-container px-4 py-3 transition-all focus-within:border-primary">
        <Search size={18} className="flex-shrink-0 text-outline-variant" />
        <input
          type="text"
          placeholder="Tìm theo mã đơn, mã giao dịch..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="flex-1 bg-transparent text-sm font-medium text-on-surface outline-none placeholder:text-on-surface-variant/40"
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
        <div className="flex flex-col items-center justify-center gap-4 py-20">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-container">
            <ReceiptText size={28} className="text-outline-variant" />
          </div>
          <p className="text-sm font-semibold text-on-surface-variant">
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
                order.service_line_count > 0 && order.item_count === 0
                  ? setSelectedServiceOrderId(order.id)
                  : setSelectedOrderId(order.id)
              }
              className="w-full space-y-3 rounded-3xl bg-surface-container-lowest p-4 text-left shadow-ambient-sm transition-transform active:scale-[0.99]"
            >
              {/* Row 1: order number + status */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex w-full flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-black tracking-widest text-primary">
                      {order.order_number ?? `#${order.id}`}
                    </span>
                    <StatusBadge status={order.status} />
                  </div>
                  <span className="text-xs text-on-surface-variant">
                    {new Date(order.created_at).toLocaleDateString("vi-VN", {
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
                <span className="text-xs font-medium text-on-surface-variant">
                  {order.item_count} sản phẩm
                </span>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-base font-black text-on-surface">
                    {formatVND(order.total_price)}
                  </span>
                  {order.status === "delivered" &&
                    order.points_earned != null &&
                    order.points_earned > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-black text-amber-600">
                        <svg
                          width="10"
                          height="10"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          aria-hidden="true"
                        >
                          <circle
                            cx="10"
                            cy="10"
                            r="10"
                            className="fill-amber-200"
                          />
                          <text
                            x="50%"
                            y="50%"
                            dominantBaseline="central"
                            textAnchor="middle"
                            fontSize="12"
                            fontWeight="900"
                            fill="#d97706"
                          >
                            P
                          </text>
                        </svg>
                        +{order.points_earned} NSP
                      </span>
                    )}
                </div>
              </div>
            </button>
          ))}

          {loadingMore ? <LoadMoreSkeleton /> : null}

          <div ref={loadMoreTriggerRef} aria-hidden="true" className="h-2" />

          {hasNextPage && !loadingMore ? (
            <div className="flex items-center justify-center py-2 text-xs text-on-surface-variant">
              <Loader2 size={14} className="mr-2 animate-spin" />
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

export default withAuthRedirect(OrdersPage);
