"use client";

import type { OrderSummary } from "@/app/api/user/orders/route";
import { OrderDetailDrawer } from "@/components/orders/OrderDetailDrawer";
import OrderStatusTabs, {
  type OrderStatusTabOption,
} from "@/components/orders/OrderStatusTabs";
import { ServiceOrderDetailDrawer } from "@/components/orders/ServiceOrderDetailDrawer";
import { SupportFAB } from "@/components/support/SupportFAB";
import { useAuth } from "@/lib/auth/AuthProvider";
import { withAuthRedirect } from "@/components/auth/withAuthRedirect";
import { formatVND } from "@/lib/currency";
import {
  useOrderByNumber,
  useOrders,
} from "@/lib/react-query/order/api/useOrderQueries";
import {
  ArrowLeft,
  CheckCircle2,
  CircleX,
  HourglassIcon,
  Loader2,
  PackageCheck,
  ReceiptText,
  RotateCcw,
  Search,
  Truck,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

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
  refunded: {
    label: "Đã hoàn tiền",
    Icon: RotateCcw,
    color: "text-slate-600",
    bg: "bg-slate-600/10",
  },
};

const STATUS_TABS: OrderStatusTabOption[] = [
  { value: "all", label: "Tất cả" },
  { value: "pending", label: "Chờ xác nhận" },
  { value: "confirmed", label: "Đã xác nhận" },
  { value: "delivering", label: "Đang giao" },
  { value: "delivered", label: "Đã giao" },
  { value: "cancelled", label: "Đã hủy" },
  { value: "refunded", label: "Đã hoàn tiền" },
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
  const searchParams = useSearchParams();

  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [activeStatus, setActiveStatus] = useState("all");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selectedServiceOrderId, setSelectedServiceOrderId] = useState<
    string | null
  >(null);
  const loadMoreTriggerRef = useRef<HTMLDivElement | null>(null);

  const orderNumberParam = searchParams.get("orderNumber");
  const orderByNumber = useOrderByNumber(orderNumberParam);

  const { data, isLoading, isFetchingNextPage, fetchNextPage, hasNextPage } =
    useOrders({ q: debouncedQ, status: activeStatus });

  // Open order detail from URL param
  useEffect(() => {
    const found = orderByNumber.data;
    if (found) setSelectedOrderId(found.id);
  }, [orderByNumber.data]);

  // Clean the URL param after handling
  useEffect(() => {
    if (!orderNumberParam) return;
    const url = new URL(window.location.href);
    url.searchParams.delete("orderNumber");
    window.history.replaceState({}, "", url.toString());
  }, [orderNumberParam]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 350);
    return () => clearTimeout(t);
  }, [q]);

  // Infinite scroll
  useEffect(() => {
    const target = loadMoreTriggerRef.current;
    if (!target || isLoading || isFetchingNextPage || !hasNextPage) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first.isIntersecting) fetchNextPage();
      },
      { rootMargin: "180px 0px" }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [
    activeStatus,
    debouncedQ,
    fetchNextPage,
    hasNextPage,
    isLoading,
    isFetchingNextPage,
  ]);

  const allOrders = data?.pages.flatMap((p) => p.orders) ?? [];
  const total = data?.pages[0]?.total ?? 0;
  const statusCounts = data?.pages[0]?.status_counts ?? {};

  const rendered = authLoading || isLoading;
  const empty = !rendered && allOrders.length === 0;

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
          <p className="text-xl font-black tracking-tight text-on-surface">
            Đơn hàng của tôi
          </p>
          {rendered ? (
            <div className="mt-1 h-3 w-16 rounded-full bg-surface-container-high" />
          ) : (
            <p className="text-xs text-on-surface-variant">{total} đơn hàng</p>
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
      {rendered ? (
        <OrderSkeleton />
      ) : empty ? (
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
          {allOrders.map((order) => (
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

          {isFetchingNextPage ? <LoadMoreSkeleton /> : null}

          <div ref={loadMoreTriggerRef} aria-hidden="true" className="h-2" />

          {hasNextPage && !isFetchingNextPage ? (
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
      <SupportFAB />
    </div>
  );
}

export default withAuthRedirect(OrdersPage);
