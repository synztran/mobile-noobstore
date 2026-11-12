"use client";

import type { OrderSummary } from "@/app/api/user/orders/route";
import { OrderDetailDrawer } from "@/components/orders/OrderDetailDrawer";
import OrderStatusTabs, {
  type OrderStatusTabOption,
} from "@/components/orders/OrderStatusTabs";
import { ServiceOrderDetailDrawer } from "@/components/orders/ServiceOrderDetailDrawer";
import { SupportFAB } from "@/components/support/SupportFAB";
import { DesktopAccountSidebar } from "@/components/profile/DesktopAccountSidebar";
import { useAuth } from "@/modules/user/client/AuthProvider";
import { withAuthRedirect } from "@/modules/user/ui/withAuthRedirect";
import { formatVND } from "@/lib/currency";
import {
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
  first_paid: {
    label: "Đã đặt cọc",
    Icon: CheckCircle2,
    color: "text-sky-600",
    bg: "bg-sky-50",
  },
  second_paid: {
    label: "Đã thanh toán đủ",
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
  returning: {
    label: "Đang hoàn hàng",
    Icon: RotateCcw,
    color: "text-amber-600",
    bg: "bg-amber-50",
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
  { value: "first_paid", label: "Đã đặt cọc" },
  { value: "confirmed", label: "Đã xác nhận" },
  { value: "delivering", label: "Đang giao" },
  { value: "delivered", label: "Đã giao" },
  { value: "returning", label: "Đang hoàn hàng" },
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
  const searchParams = useSearchParams();

  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [activeStatus, setActiveStatus] = useState("all");
  const orderNumberParam = searchParams.get("orderNumber");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(orderNumberParam);
  const [selectedServiceOrderId, setSelectedServiceOrderId] = useState<
    string | null
  >(null);
  const loadMoreTriggerRef = useRef<HTMLDivElement | null>(null);

  const { data, isLoading, isFetchingNextPage, fetchNextPage, hasNextPage } =
    useOrders({ q: debouncedQ, status: activeStatus });

  // Open order detail from URL param
  useEffect(() => {
    if (orderNumberParam) {
      setSelectedOrderId(orderNumberParam);
    }
  }, [orderNumberParam]);

  const handleCloseDetail = useCallback(() => {
    setSelectedOrderId(null);
    if (searchParams.get("orderNumber")) {
      const url = new URL(window.location.href);
      url.searchParams.delete("orderNumber");
      window.history.replaceState({}, "", url.toString());
    }
  }, [searchParams]);

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

  const renderOrders = (desktop: boolean) => rendered ? (
    <OrderSkeleton />
  ) : empty ? (
    <div className="flex flex-col items-center justify-center gap-4 py-20">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-container"><ReceiptText size={28} className="text-outline-variant" /></div>
      <p className="text-sm font-semibold text-on-surface-variant">{q || activeStatus !== "all" ? "Không tìm thấy đơn hàng" : "Chưa có đơn hàng nào"}</p>
    </div>
  ) : desktop ? (
    <div className="overflow-hidden rounded-2xl bg-surface-container-lowest shadow-ambient-sm">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-outline-variant/30 bg-surface-container-low text-xs uppercase tracking-wide text-on-surface-variant"><tr><th className="px-5 py-3">Mã đơn</th><th className="px-5 py-3">Ngày đặt</th><th className="px-5 py-3">Trạng thái</th><th className="px-5 py-3">Sản phẩm</th><th className="px-5 py-3 text-right">Tổng tiền</th></tr></thead>
        <tbody className="divide-y divide-outline-variant/20">{allOrders.map((order) => <tr key={order.id} className="hover:bg-surface-container-low/60">
          <td className="px-5 py-4"><button type="button" onClick={() => order.service_line_count > 0 && order.item_count === 0 ? setSelectedServiceOrderId(order.id) : setSelectedOrderId(order.id)} className="min-h-11 font-black tracking-wide text-primary underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">{order.order_number ?? `#${order.id}`}</button></td>
          <td className="whitespace-nowrap px-5 py-4 text-on-surface-variant">{new Date(order.created_at).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })}</td>
          <td className="px-5 py-4"><StatusBadge status={order.status} /></td><td className="px-5 py-4 text-on-surface-variant">{order.item_count} sản phẩm</td><td className="whitespace-nowrap px-5 py-4 text-right font-black text-on-surface">{formatVND(order.total_price)}{order.status === "delivered" && (order.points_earned ?? 0) > 0 && <span className="ml-2 text-xs text-amber-600">+{order.points_earned} NSP</span>}</td>
        </tr>)}</tbody>
      </table>
      {isFetchingNextPage && <LoadMoreSkeleton />}
    </div>
  ) : (
    <div className="space-y-3">
      {allOrders.map((order) => <button key={order.id} onClick={() => order.service_line_count > 0 && order.item_count === 0 ? setSelectedServiceOrderId(order.id) : setSelectedOrderId(order.id)} className="w-full space-y-3 rounded-3xl bg-surface-container-lowest p-4 text-left shadow-ambient-sm transition-transform active:scale-[0.99]">
        <div className="flex w-full flex-col gap-2"><div className="flex items-center justify-between gap-2"><span className="text-sm font-black tracking-widest text-primary">{order.order_number ?? `#${order.id}`}</span><StatusBadge status={order.status} /></div><span className="text-xs text-on-surface-variant">{new Date(order.created_at).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })}</span></div>
        <div className="flex items-center justify-between"><span className="text-xs font-medium text-on-surface-variant">{order.item_count} sản phẩm</span><span className="text-base font-black text-on-surface">{formatVND(order.total_price)}{order.status === "delivered" && (order.points_earned ?? 0) > 0 && <span className="ml-2 text-xs text-amber-600">+{order.points_earned} NSP</span>}</span></div>
      </button>)}
      {isFetchingNextPage && <LoadMoreSkeleton />}{hasNextPage && !isFetchingNextPage && <div className="flex items-center justify-center py-2 text-xs text-on-surface-variant"><Loader2 size={14} className="mr-2 animate-spin" />Đang tải thêm đơn hàng...</div>}
    </div>
  );

  return (
    <>
    <div className="hidden px-6 pb-16 pt-8 lg:block">
      <div className="mx-auto grid max-w-7xl grid-cols-[15rem_minmax(0,1fr)] gap-8">
        <DesktopAccountSidebar activeHref="/profile/orders" />
        <main className="min-w-0 space-y-5">
          <div className="flex items-end justify-between"><div><h1 className="text-3xl font-extrabold text-on-surface">Đơn hàng của tôi</h1><p className="mt-1 text-sm text-on-surface-variant">{total} đơn hàng</p></div></div>
          <div className="flex items-center gap-3 rounded-2xl border-2 border-transparent bg-surface-container px-4 py-3 focus-within:border-primary"><Search size={18} className="flex-shrink-0 text-outline-variant" /><input type="text" placeholder="Tìm theo mã đơn, mã giao dịch..." value={q} onChange={(e) => setQ(e.target.value)} className="flex-1 bg-transparent text-sm font-medium text-on-surface outline-none placeholder:text-on-surface-variant/40" />{q && <button aria-label="Xoá tìm kiếm" onClick={() => setQ("")}><X size={18} /></button>}</div>
          <OrderStatusTabs value={activeStatus} onChange={setActiveStatus} options={STATUS_TABS.map((tab) => ({ ...tab, count: statusCounts[tab.value] ?? 0 }))} />
          {renderOrders(true)}
        </main>
      </div>
    </div>
    <div className="space-y-5 px-4 pb-24 pt-2 lg:hidden">
      {/* Header */}
      <div className="mb-2 flex items-center gap-3">
        <Link
          href="/profile"
          aria-label="Quay lại"
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
          <button aria-label="Xoá tìm kiếm" onClick={() => setQ("")}>
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
      {renderOrders(false)}
      <SupportFAB />
    </div>
    {hasNextPage && <div ref={loadMoreTriggerRef} aria-hidden="true" className="h-2" />}
    <OrderDetailDrawer orderId={selectedOrderId} onClose={handleCloseDetail} />
      <div className="lg:hidden">
        <ServiceOrderDetailDrawer orderId={selectedServiceOrderId} onClose={() => setSelectedServiceOrderId(null)} />
      </div>
    </>
  );
}

export default withAuthRedirect(OrdersPage);
