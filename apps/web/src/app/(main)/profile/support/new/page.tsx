"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, RefreshCw } from "lucide-react";

import { CreateTicketForm } from "@/components/support/CreateTicketForm";
import {
  useOrderDetail,
  useOrderByNumber,
} from "@/lib/react-query/order/api/useOrderQueries";
import { formatVND } from "@/lib/currency";
import Link from "next/link";

const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: "Chờ xác nhận",
  confirmed: "Đã xác nhận",
  delivering: "Đang giao",
  delivered: "Đã giao",
  cancelled: "Đã hủy",
  refunded: "Đã hoàn tiền",
};

function OrderSkeleton() {
  return (
    <div className="animate-pulse space-y-3 rounded-2xl bg-surface-container px-4 py-4">
      <div className="h-3 w-20 rounded-full bg-surface-container-high" />
      <div className="h-4 w-44 rounded-full bg-surface-container-high" />
      <div className="flex gap-2">
        <div className="h-5 w-24 rounded-lg bg-surface-container-high" />
        <div className="h-5 w-20 rounded-lg bg-surface-container-high" />
      </div>
    </div>
  );
}

function OrderSummaryBanner({
  orderNumber,
  totalPrice,
  shippingFee,
  voucherDiscount,
  shippingDiscount,
  itemCount,
}: {
  orderNumber: string;
  totalPrice?: number;
  shippingFee?: number;
  voucherDiscount?: number;
  shippingDiscount?: number;
  itemCount: number;
}) {
  return (
    <div className="rounded-2xl bg-surface-container px-4 py-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
          Đơn hàng
        </p>
        <div className="flex items-center gap-2">
          <p className="text-xs font-black tracking-wider text-primary">
            {orderNumber}
          </p>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-2">
        {totalPrice != null && (
          <span className="rounded-lg bg-surface-container-high px-2.5 py-1 text-xs font-bold text-on-surface">
            {formatVND(totalPrice)}
          </span>
        )}
        {shippingFee != null && shippingFee > 0 && (
          <span className="rounded-lg bg-surface-container-high px-2.5 py-1 text-xs font-bold text-on-surface">
            + {formatVND(shippingFee)} ship
          </span>
        )}
        {(voucherDiscount ?? 0) > 0 && (
          <span className="rounded-lg bg-error/10 px-2.5 py-1 text-xs font-bold text-error">
            -{formatVND(voucherDiscount ?? 0)}
          </span>
        )}
        {(shippingDiscount ?? 0) > 0 && (
          <span className="rounded-lg bg-error/10 px-2.5 py-1 text-xs font-bold text-error">
            -{formatVND(shippingDiscount ?? 0)} ship
          </span>
        )}
        <span className="ml-auto text-xs text-on-surface-variant">
          {itemCount} sản phẩm
        </span>
      </div>
    </div>
  );
}

function NewTicketPageContent() {
  const sp = useSearchParams();
  const orderIdParam = sp.get("order_id");
  const orderNumberParam = sp.get("order_number");

  const hasParams = !!orderIdParam || !!orderNumberParam;

  const [pickedOrderId, setPickedOrderId] = useState<string | null>(null);

  const { data: orderSummary } = useOrderByNumber(
    !hasParams ? null : (orderNumberParam ?? null)
  );
  const resolvedOrderId = hasParams
    ? orderIdParam || orderSummary?.id || null
    : pickedOrderId;

  const { data: orderDetail, isLoading: isLoadingDetail } =
    useOrderDetail(resolvedOrderId);

  const { data: ordersData, isLoading: isLoadingOrders } = useQuery<{
    orders: Array<{
      id: string;
      order_number: string;
      status: string;
      total_price: number;
      item_count: number;
      created_at: string;
    }>;
  }>({
    queryKey: ["orders-picker"],
    queryFn: async () => {
      const res = await fetch("/api/user/orders?page=1&limit=50");
      return res.json();
    },
    enabled: !hasParams,
  });

  const handleOnChangeOrder = () => setPickedOrderId(null);

  const orders = useMemo(() => {
    const availableStatuses = [
      "pending",
      "confirmed",
      "delivering",
      "delivered",
      "refuneded",
    ];
    return (
      ordersData?.orders?.filter((order) =>
        availableStatuses.includes(order.status)
      ) || []
    );
  }, [ordersData?.orders]);

  const isResolving =
    hasParams &&
    !!orderNumberParam &&
    !orderIdParam &&
    !orderDetail &&
    !isLoadingDetail;

  return (
    <div className="space-y-2 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/profile/support"
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface-container transition-transform active:scale-90"
          >
            <ArrowLeft size={18} />
          </Link>
          <p className="text-xl font-black tracking-tight text-on-surface">
            Gửi yêu cầu hỗ trợ
          </p>
        </div>
        {handleOnChangeOrder && pickedOrderId && (
          <button
            type="button"
            onClick={handleOnChangeOrder}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-surface-container-high transition-all active:scale-90"
          >
            <RefreshCw size={14} />
          </button>
        )}
      </div>

      {/* Order section — always visible */}
      <div className="rounded-2xl bg-surface-container-lowest p-2 shadow-ambient-sm">
        {hasParams ? (
          isLoadingDetail ? (
            <OrderSkeleton />
          ) : isResolving ? (
            <OrderSkeleton />
          ) : orderDetail ? (
            <OrderSummaryBanner
              orderNumber={orderDetail.order_number}
              totalPrice={orderDetail.total_price}
              shippingFee={orderDetail.shipping_fee}
              voucherDiscount={orderDetail.voucher_discount_amount}
              shippingDiscount={orderDetail.shipping_discount_amount}
              itemCount={orderDetail.items.length}
            />
          ) : (
            <p className="py-4 text-center text-sm text-on-surface-variant">
              Không tìm thấy đơn hàng
            </p>
          )
        ) : isLoadingOrders ? (
          <OrderSkeleton />
        ) : orders?.length === 0 ? (
          <p className="py-4 text-center text-sm text-on-surface-variant">
            Bạn chưa có đơn hàng nào
          </p>
        ) : resolvedOrderId ? (
          (() => {
            const picked = orderDetail;
            if (isLoadingDetail) return <OrderSkeleton />;
            if (!picked) {
              return (
                <p className="py-4 text-center text-sm text-on-surface-variant">
                  Không tìm thấy đơn hàng
                </p>
              );
            }
            return (
              <OrderSummaryBanner
                orderNumber={picked.order_number}
                totalPrice={picked.total_price}
                shippingFee={picked.shipping_fee}
                voucherDiscount={picked.voucher_discount_amount}
                shippingDiscount={picked.shipping_discount_amount}
                itemCount={picked.items.length}
              />
            );
          })()
        ) : (
          /* Order picker */
          <div className="space-y-1.5 p-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
              Chọn đơn hàng
            </label>
            <select
              value=""
              onChange={(e) => setPickedOrderId(e.target.value)}
              className="w-full rounded-2xl border-2 border-transparent bg-surface-container px-4 py-3 text-sm font-semibold text-on-surface outline-none transition-all focus:border-primary"
            >
              <option value="" disabled>
                -- Chọn đơn hàng --
              </option>
              {orders.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.order_number} — {ORDER_STATUS_LABELS[o.status] ?? o.status}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Ticket form — only when an order is selected */}
      {resolvedOrderId && orderDetail && (
        <div className="rounded-2xl bg-surface-container-lowest p-2 shadow-ambient-sm">
          <CreateTicketForm
            orderItems={orderDetail.items}
            orderId={orderDetail.id}
            orderNumber={orderDetail.order_number}
          />
        </div>
      )}
    </div>
  );
}

export default function NewTicketPage() {
  return (
    <Suspense>
      <NewTicketPageContent />
    </Suspense>
  );
}
