"use client";

import type { OrderDetail } from "@/app/api/user/orders/[id]/route";
import { OrderPaymentPanel } from "@/components/orders/OrderPaymentPanel";
import { VoucherInfo } from "@/components/voucher/VoucherInfo";
import { formatVND } from "@/lib/currency";
import { toast } from "@/lib/toast";
import { useOrderDetail } from "@/lib/react-query/order/api/useOrderQueries";
import { useCancelOrder } from "@/lib/react-query/order/api/useOrderMutations";
import {
  AlertCircle,
  CheckCircle2,
  CircleX,
  HourglassIcon,
  PackageCheck,
  Truck,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { usePreventScroll } from "@/hooks/usePreventScroll";

const STATUS_CONFIG: Record<
  string,
  { label: string; Icon: React.ElementType; color: string; bg: string }
> = {
  pending: {
    label: "Đang kiểm tra",
    Icon: HourglassIcon,
    color: "text-amber-600",
    bg: "bg-amber-50",
  },
  confirmed: {
    label: "Đã xác nhận",
    Icon: CheckCircle2,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
  },
  preparing: {
    label: "Đang chuẩn bị hàng",
    Icon: PackageCheck,
    color: "text-sky-700",
    bg: "bg-sky-50",
  },
  delivering: {
    label: "Đang vận chuyển",
    Icon: Truck,
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  paid: {
    label: "Đã thanh toán",
    Icon: CheckCircle2,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
  },
  shipped: {
    label: "Đang vận chuyển",
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
    Icon: CircleX,
    color: "text-error",
    bg: "bg-error/5",
  },
};

interface Props {
  orderId: string | null;
  onClose: () => void;
}

const CANCELLABLE_STATUSES = ["pending"];
const NON_TERMINAL_STATUSES = [
  "pending",
  "confirmed",
  "preparing",
  "delivering",
  "delivered",
];
const TIMELINE_STEPS = [
  { key: "pending", label: "Đang kiểm tra" },
  { key: "confirmed", label: "Đã xác nhận" },
  { key: "delivering", label: "Đang giao" },
  { key: "delivered", label: "Đã giao" },
];

function OrderDetailContent({
  detail,
  onClose,
}: {
  detail: OrderDetail;
  onClose: () => void;
}) {
  const router = useRouter();
  const cancelMutation = useCancelOrder();
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const isSupportAvailable = NON_TERMINAL_STATUSES.includes(detail.status);
  const isCancellable = CANCELLABLE_STATUSES.includes(detail.status);
  const cfg = STATUS_CONFIG[detail.status] ?? STATUS_CONFIG.pending;
  const voucherDiscount = detail.voucher_discount_amount ?? 0;
  const shippingDiscount = detail.shipping_discount_amount ?? 0;
  const totalDiscount = voucherDiscount + shippingDiscount;
  const cancelledAtLabel = detail.cancelled_at
    ? new Date(detail.cancelled_at).toLocaleString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  const handleCancelOrder = async () => {
    try {
      await cancelMutation.mutateAsync({
        orderId: detail.id,
        reason: cancelReason,
      });
      toast.success("Đã hủy đơn hàng thành công");
      setShowCancelModal(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Không thể hủy đơn hàng"
      );
    }
  };

  return (
    <>
      {/* Status */}
      {(() => {
        const StatusIcon = cfg.Icon;
        return (
          <div
            className={`flex items-center gap-3 rounded-2xl px-4 py-3 ${cfg.bg}`}
          >
            <StatusIcon size={22} className={cfg.color} />
            <p className={`text-sm font-black ${cfg.color}`}>{cfg.label}</p>
          </div>
        );
      })()}

      {/* Status timeline */}
      {NON_TERMINAL_STATUSES.includes(detail.status) && (
        <ul className="steps steps-horizontal w-full">
          {TIMELINE_STEPS.map((step, i) => {
            const currentIdx = TIMELINE_STEPS.findIndex(
              (s) => s.key === detail.status
            );
            const isCompleted = i < currentIdx;
            const isCurrent = i === currentIdx;
            return (
              <li
                key={step.key}
                className={`step text-[10px] font-bold ${
                  isCompleted
                    ? "step-neutral text-on-surface"
                    : isCurrent
                      ? "step-primary text-primary"
                      : "text-on-surface-variant/50"
                }`}
              >
                {step.label}
              </li>
            );
          })}
        </ul>
      )}

      {/* Cancelled details */}
      {detail.status === "cancelled" && (
        <div className="space-y-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-error">
            Chi tiết hủy đơn
          </p>
          <div className="space-y-2 rounded-2xl border border-error/20 bg-error/5 px-4 py-3 text-sm">
            <div className="flex items-start justify-between gap-3">
              <span className="text-on-surface-variant">Thời gian hủy</span>
              <span className="text-right font-bold text-on-surface">
                {cancelledAtLabel ?? "Không có thông tin"}
              </span>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-on-surface-variant">Ghi chú hủy</p>
              <p className="rounded-xl bg-surface px-3 py-2 text-sm leading-relaxed text-on-surface">
                {detail.cancelled_note?.trim() ||
                  "Không có ghi chú hủy từ hệ thống."}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Cancel button */}
      {isCancellable && (
        <button
          onClick={() => setShowCancelModal(true)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-error/20 bg-error/5 py-3 text-sm font-black uppercase tracking-wider text-error transition-all active:scale-[0.98]"
        >
          <CircleX size={16} />
          Huỷ đơn hàng
        </button>
      )}

      {/* Order items */}
      {detail.items.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
              Sản phẩm ({detail.items.length})
            </p>
            <div className="flex items-center gap-2">
              {isSupportAvailable && (
                <button
                  onClick={() => {
                    router.push(
                      `/profile/support/new?order_id=${detail.id}&order_number=${detail.order_number}`
                    );
                    onClose();
                  }}
                  className="flex items-center gap-1 rounded-lg border border-error/20 bg-error/5 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-error transition-all active:scale-90"
                >
                  <AlertCircle size={12} className="text-error" />
                  Báo cáo vấn đề
                </button>
              )}
            </div>
          </div>
          {detail.items.map((item) => (
            <div key={item.id} className="space-y-1">
              <div className="flex items-start gap-2 rounded-2xl bg-surface-container-lowest p-2">
                <div className="relative flex h-20 w-24">
                  {item.thumbnail ? (
                    <Image
                      src={item.thumbnail}
                      alt={item.product_name}
                      fill
                      className="rounded-xl object-cover"
                    />
                  ) : (
                    <PackageCheck size={24} className="text-outline-variant" />
                  )}
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="line-clamp-3 text-sm font-bold text-on-surface">
                    {item.product_name}
                  </p>
                  {item.components.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2">
                      {item.components.map((component) => (
                        <p
                          key={`${item.id}-${component.variant_id}`}
                          className="truncate rounded-md bg-gray-200 px-2 py-1 text-[10px] leading-snug text-on-surface-variant"
                        >
                          {component.component_group}:{" "}
                          <span className="font-semibold text-on-surface">
                            {component.variant_name}
                          </span>
                        </p>
                      ))}
                    </div>
                  )}
                  <div className="mt-1.5 flex items-center justify-between">
                    <span className="text-xs text-on-surface-variant">
                      Số lượng: {item.quantity}
                    </span>
                    <span className="text-sm font-black text-primary">
                      {formatVND(item.unit_price * item.quantity)}
                    </span>
                  </div>
                </div>
              </div>
              {item.gifts && item.gifts.length > 0 && (
                <div className="ml-1 border-l-2 border-rose-200 pl-3">
                  {item.gifts.map((g) => (
                    <div
                      key={g.gift_name}
                      className="flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-2"
                    >
                      {g.gift_thumbnail ? (
                        <div className="relative h-8 w-8 flex-shrink-0 overflow-hidden rounded-lg bg-rose-100">
                          <Image
                            src={g.gift_thumbnail}
                            alt={g.gift_name}
                            fill
                            className="object-cover"
                            sizes="32px"
                          />
                        </div>
                      ) : (
                        <span className="text-base">🎁</span>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-black uppercase tracking-wider text-rose-500">
                          Quà tặng kèm
                        </p>
                        <p className="truncate text-xs font-semibold text-rose-700">
                          {g.gift_name}
                          {g.quantity > 1 && ` x${g.quantity}`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Delivery information */}
      {detail.delivery_address && (
        <div className="space-y-2">
          <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
            <Truck size={14} />
            Thông tin giao hàng
          </p>
          <div className="space-y-1 rounded-2xl bg-surface-container p-4">
            {detail.delivery_address.full_name && (
              <p className="text-sm font-bold text-on-surface">
                {detail.delivery_address.full_name}
                {detail.delivery_address.phone_number
                  ? ` - ${detail.delivery_address.phone_number}`
                  : ""}
              </p>
            )}
            <p className="text-sm text-on-surface-variant">
              {[
                detail.delivery_address.street_address,
                detail.delivery_address.apartment,
                detail.delivery_address.ward,
                detail.delivery_address.district,
                detail.delivery_address.city,
              ]
                .filter(Boolean)
                .join(", ")}
            </p>
            <p className="space-x-1">
              <strong className="text-sm">Ghi chú:</strong>
              <small>{detail.delivery_address.notes}</small>
            </p>
          </div>
        </div>
      )}

      {/* Payment panel */}
      {detail.status === "pending" && (
        <OrderPaymentPanel
          orderNumber={detail.order_number}
          totalPrice={detail.total_price}
          shippingFee={detail.shipping_fee}
          voucherDiscount={voucherDiscount}
          shippingDiscount={shippingDiscount}
        />
      )}

      {/* Voucher Info */}
      {(detail.voucher_code || totalDiscount > 0) && (
        <VoucherInfo
          voucherCode={detail.voucher_code}
          discountAmount={voucherDiscount}
          shippingDiscountAmount={shippingDiscount}
        />
      )}

      {/* Price summary */}
      {["confirmed", "delivering", "delivered"].includes(detail.status) && (
        <div className="space-y-2 rounded-2xl bg-surface-container px-4 py-3">
          <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
            Tổng cộng
          </p>
          <div className="flex justify-between text-sm">
            <span className="text-on-surface-variant">Tạm tính</span>
            <span className="font-bold text-on-surface">
              {formatVND(
                detail.items.reduce((s, i) => s + i.unit_price * i.quantity, 0)
              )}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-on-surface-variant">Vận chuyển</span>
            <span className="font-bold text-on-surface">
              {formatVND(detail.shipping_fee)}
            </span>
          </div>
          {voucherDiscount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-on-surface-variant">Giảm giá voucher</span>
              <span className="font-bold text-secondary">
                -{formatVND(voucherDiscount)}
              </span>
            </div>
          )}
          {shippingDiscount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-on-surface-variant">
                Giảm phí vận chuyển
              </span>
              <span className="font-bold text-secondary">
                -{formatVND(shippingDiscount)}
              </span>
            </div>
          )}
          <div className="h-px bg-outline-variant/30" />
          <div className="flex justify-between">
            <span className="font-black text-on-surface">Tổng đơn hàng</span>
            <div className="text-right">
              <span className="block text-base font-black text-primary">
                {formatVND(detail.total_price)}
              </span>
              {totalDiscount > 0 && (
                <span className="text-xs text-on-surface-variant line-through">
                  {formatVND(detail.total_price + totalDiscount)}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Invoice download */}
      {detail.invoice_url &&
        ["confirmed", "delivering", "delivered"].includes(detail.status) && (
          <a
            href={detail.invoice_url}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto flex max-w-max items-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-black text-white transition-transform active:scale-95"
          >
            <PackageCheck size={18} />
            Tải hóa đơn
          </a>
        )}

      {/* Cancel confirmation modal */}
      <dialog
        className={`modal ${showCancelModal ? "modal-open" : ""}`}
        onClick={(e) => {
          if (e.target === e.currentTarget) setShowCancelModal(false);
        }}
      >
        <div className="modal-box rounded-3xl">
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-error/10">
              <CircleX size={24} className="text-error" />
            </div>
            <p className="text-lg font-black text-on-surface">Huỷ đơn hàng</p>
            <p className="text-sm text-on-surface-variant">
              Hành động này không thể hoàn tác. Bạn có chắc chắn muốn hủy đơn{" "}
              <span className="font-bold text-on-surface">
                {detail.order_number}
              </span>
              ?
            </p>
          </div>
          <div className="mt-4 space-y-1.5">
            <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
              Lý do hủy (không bắt buộc)
            </p>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Nhập lý do hủy (nếu có)..."
              rows={3}
              className="w-full rounded-2xl bg-surface-container px-4 py-3 text-sm text-on-surface outline-none transition-all focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="modal-action">
            <button
              onClick={() => setShowCancelModal(false)}
              className="btn rounded-full border-0 bg-surface-container px-6 text-sm font-bold normal-case text-on-surface"
            >
              Huỷ
            </button>
            <button
              onClick={handleCancelOrder}
              disabled={cancelMutation.isPending}
              className="btn rounded-full border-0 bg-error px-6 text-sm font-bold normal-case text-white transition-all active:scale-[0.98] disabled:opacity-60"
            >
              {cancelMutation.isPending ? (
                <span className="loading loading-spinner loading-sm" />
              ) : (
                "Xác nhận huỷ đơn"
              )}
            </button>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button onClick={() => setShowCancelModal(false)}>close</button>
        </form>
      </dialog>
    </>
  );
}

function DrawerSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-14 rounded-2xl bg-surface-container" />
      <div className="h-28 rounded-2xl bg-surface-container" />
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="flex gap-3">
            <div className="h-16 w-16 flex-shrink-0 rounded-2xl bg-surface-container" />
            <div className="flex-1 space-y-2 pt-1">
              <div className="h-3 w-3/4 rounded-full bg-surface-container" />
              <div className="h-3 w-1/2 rounded-full bg-surface-container" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function OrderDetailDrawer({ orderId, onClose }: Props) {
  const isOpen = orderId !== null;
  const { data: detail, isLoading } = useOrderDetail(isOpen ? orderId : null);
  usePreventScroll(isOpen)

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[60] !mt-0 bg-on-surface/30 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`duration-250 fixed left-0 right-0 z-[999] flex max-h-[85dvh] flex-col rounded-t-5xl bg-surface transition-all ease-out ${
          isOpen ? "bottom-0" : "-bottom-full"
        }`}
        style={{ height: "85dvh" }}
      >
        {/* Handle */}
        <div className="flex flex-shrink-0 justify-center pb-1 pt-3">
          <div className="h-1 w-10 rounded-full bg-outline-variant" />
        </div>

        {/* Header */}
        <div className="flex flex-shrink-0 items-center justify-between border-b border-outline-variant/20 px-5 py-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
              Chi tiết đơn hàng
            </p>
            <p className="text-base font-black tracking-widest text-primary">
              {detail?.order_number ?? (isLoading ? "…" : `#${orderId}`)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl border border-outline-variant/40 bg-surface-container px-3 py-1.5 text-xs font-bold text-on-surface transition-all active:scale-90"
          >
            Đóng
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
          {(() => {
            if (isLoading) return <DrawerSkeleton />;
            if (!detail)
              return (
                <div className="flex items-center justify-center py-20 text-sm text-on-surface-variant">
                  Không thể tải chi tiết đơn hàng
                </div>
              );
            return <OrderDetailContent detail={detail} onClose={onClose} />;
          })()}
        </div>
      </div>
    </>
  );
}
