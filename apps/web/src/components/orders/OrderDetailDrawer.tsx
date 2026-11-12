"use client";

import type { OrderDetail } from "@/app/api/user/orders/[id]/route";
import { OrderPaymentPanel } from "@/components/orders/OrderPaymentPanel";
import OrderTrackingTimeline from "@/components/orders/OrderTrackingTimeline";
import { VoucherInfo } from "@/components/voucher/VoucherInfo";
import { formatVND } from "@/lib/currency";
import {
  isCarrierShippingMethod,
  hasUnquotedShippingFee,
  isPickupShippingMethod,
} from "@/lib/shipping-method";
import { buildTrackingUrl } from "@/lib/tracking";
import { toast } from "@/lib/toast";
import { useOrderDetail } from "@/lib/react-query/order/api/useOrderQueries";
import {
  PickupCodeError,
  useCancelOrder,
  usePickupCode,
  useReturnOrder,
} from "@/lib/react-query/order/api/useOrderMutations";
import { CopyToClipboardButton } from "@/components/ui/CopyToClipboardButton";
import {
  AlertCircle,
  CheckCircle2,
  CircleX,
  ExternalLink,
  HourglassIcon,
  MapPin,
  PackageCheck,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Timer,
  Truck,
} from "lucide-react";
import Image from "@/components/ui/AdaptiveImage";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { usePreventScroll } from "@/hooks/usePreventScroll";
import { NOT_FOUND_IMAGE } from "@/lib/images";
import { useAuth } from "@/modules/user/client/AuthProvider";

const STATUS_CONFIG: Record<
  string,
  { label: string; Icon: React.ElementType; color: string; bg: string }
> = {
  pending: {
    label: "Đang kiểm tra",
    Icon: HourglassIcon,
    color: "text-amber-600",
    bg: "bg-amber-100",
  },
  confirmed: {
    label: "Đã xác nhận",
    Icon: CheckCircle2,
    color: "text-emerald-600",
    bg: "bg-emerald-100",
  },
  first_paid: {
    label: "Đã thanh toán lần 1 (đặt cọc)",
    Icon: CheckCircle2,
    color: "text-sky-600",
    bg: "bg-sky-100",
  },
  second_paid: {
    label: "Đã thanh toán đủ",
    Icon: CheckCircle2,
    color: "text-emerald-600",
    bg: "bg-emerald-100",
  },
  preparing: {
    label: "Đang chuẩn bị hàng",
    Icon: PackageCheck,
    color: "text-sky-700",
    bg: "bg-sky-100",
  },
  delivering: {
    label: "Đang vận chuyển",
    Icon: Truck,
    color: "text-blue-600",
    bg: "bg-blue-100",
  },
  paid: {
    label: "Đã thanh toán",
    Icon: CheckCircle2,
    color: "text-emerald-600",
    bg: "bg-emerald-100",
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
  returning: {
    label: "Đang hoàn hàng",
    Icon: RotateCcw,
    color: "text-amber-600",
    bg: "bg-amber-100",
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

const CANCELLABLE_STATUSES = [
  "pending",
  "confirmed",
  "first_paid",
  "second_paid",
];
const NON_TERMINAL_STATUSES = ["delivered", "returning"];

const RETURN_REASON_OPTIONS = [
  "Sản phẩm bị lỗi / hỏng",
  "Sản phẩm không đúng như mô tả",
  "Giao sai / thiếu sản phẩm",
  "Không còn nhu cầu sử dụng",
  "Khác",
];

const RETURN_ADDRESS_TEXT =
  "Noobstore HCM — Số 123, Đường Nguyễn Văn Cừ, Phường 4, Quận 5, TP. Hồ Chí Minh";

const RETURN_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;

function isWithinReturnWindow(deliveredAt: string | null): boolean {
  if (!deliveredAt) return false;
  const t = new Date(deliveredAt).getTime();
  if (Number.isNaN(t)) return false;
  return Date.now() - t < RETURN_WINDOW_MS;
}

function PaymentCountdown({ createdAt }: { createdAt: string }) {
  const calcRemaining = useCallback(() => {
    const created = new Date(createdAt);
    const endOfDay = new Date(created);
    endOfDay.setHours(23, 59, 59, 999);
    return Math.max(0, endOfDay.getTime() - Date.now());
  }, [createdAt]);

  const [remaining, setRemaining] = useState(calcRemaining);

  useEffect(() => {
    setRemaining(calcRemaining());
    const interval = setInterval(() => setRemaining(calcRemaining()), 1000);
    return () => clearInterval(interval);
  }, [calcRemaining]);

  const hours = Math.floor(remaining / 3600000);
  const minutes = Math.floor((remaining % 3600000) / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);

  if (remaining <= 0) {
    return (
      <div className="flex w-full items-center justify-center gap-2 rounded-2xl border border-error/15 bg-error/5 px-4 py-2.5">
        <p className="text-xs font-bold text-error">Hết hạn thanh toán</p>
      </div>
    );
  }

  return (
    <div className="w-full items-center justify-between rounded-md bg-surface-container px-4 py-2.5">
      <p className="text-xs font-semibold">
        Vui lòng thanh toán trong thời gian quy định, tránh bị hủy đơn do quá
        hạn thanh toán
      </p>
      <p className="text-right font-black tabular-nums tracking-wide text-red-600">
        <span className="text-[10px] text-black">còn</span>&nbsp;
        {String(hours).padStart(2, "0")}:{String(minutes).padStart(2, "0")}:
        {String(seconds).padStart(2, "0")}
      </p>
    </div>
  );
}

function OrderDetailContent({
  detail,
  onClose,
}: {
  detail: OrderDetail;
  onClose: () => void;
}) {
  const router = useRouter();
  const cancelMutation = useCancelOrder();
  const returnMutation = useReturnOrder();
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnReason, setReturnReason] = useState(
    RETURN_REASON_OPTIONS[0] ?? "Khác"
  );
  const [returnCustomReason, setReturnCustomReason] = useState("");
  const [addressCopied, setAddressCopied] = useState(false);
  const pickupMutation = usePickupCode();
  const [activePickupCode, setActivePickupCode] = useState<{
    code: string;
    expiresAt: string;
  } | null>(null);
  const [pickupCodeSecondsLeft, setPickupCodeSecondsLeft] = useState(0);
  const [pickupWaitSecondsLeft, setPickupWaitSecondsLeft] = useState(0);

  useEffect(() => {
    if (!activePickupCode) return;
    const update = () =>
      setPickupCodeSecondsLeft(
        Math.max(
          0,
          Math.ceil(
            (Date.parse(activePickupCode.expiresAt) - Date.now()) / 1000
          )
        )
      );
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [activePickupCode?.expiresAt]);

  useEffect(() => {
    if (pickupWaitSecondsLeft <= 0) return;
    const t = setInterval(
      () => setPickupWaitSecondsLeft((prev) => Math.max(0, prev - 1)),
      1000
    );
    return () => clearInterval(t);
  }, [pickupWaitSecondsLeft > 0]);

  const formatCountdown = (seconds: number) =>
    `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(
      seconds % 60
    ).padStart(2, "0")}`;

  const handleShowPickupCode = async () => {
    try {
      const data = await pickupMutation.mutateAsync({ orderId: detail.id });
      setPickupWaitSecondsLeft(0);
      if (data.code) {
        setActivePickupCode({ code: data.code, expiresAt: data.expiresAt });
      }
    } catch (err) {
      if (
        err instanceof PickupCodeError &&
        err.cooldownSecondsLeft &&
        err.cooldownSecondsLeft > 0
      ) {
        setPickupWaitSecondsLeft(err.cooldownSecondsLeft);
        return;
      }
      if (
        err instanceof PickupCodeError &&
        err.lockSecondsLeft &&
        err.lockSecondsLeft > 0
      ) {
        setPickupWaitSecondsLeft(err.lockSecondsLeft);
        toast.error(
          err instanceof Error ? err.message : "Không thể tạo mã nhận hàng"
        );
        return;
      }
      toast.error(
        err instanceof Error ? err.message : "Không thể tạo mã nhận hàng"
      );
    }
  };

  const isSupportAvailable = NON_TERMINAL_STATUSES.includes(detail.status);
  const isCancellable = CANCELLABLE_STATUSES.includes(detail.status);
  // Fulfilled by a third-party courier (full address + tracking link) vs the
  // courier tiers whose fee is still unquoted ("Cập nhật sau").
  const isCarrierMethod = isCarrierShippingMethod(detail.shipping_method_id);
  // Reads the quoted amount once staff enter it, so the copy clears itself
  // instead of showing "Cập nhật sau" on an order that has been priced.
  const shippingFeePending = hasUnquotedShippingFee(
    detail.shipping_method_id,
    detail.shipping_fee
  );
  const isPickup = isPickupShippingMethod(detail.shipping_method_id);
  const canRequestReturn =
    detail.status === "delivered" &&
    isWithinReturnWindow(detail.delivered_at) &&
    !isPickup;
  const isPickupReturnBlocked =
    detail.status === "delivered" &&
    isWithinReturnWindow(detail.delivered_at) &&
    isPickup;
  const cfg = STATUS_CONFIG[detail.status] ?? STATUS_CONFIG.pending;
  const voucherDiscount = detail.voucher_discount_amount ?? 0;
  const shippingDiscount = detail.shipping_discount_amount ?? 0;
  const totalDiscount = voucherDiscount + shippingDiscount;
  const pickupRecipient = isPickup ? (detail.delivery_address ?? null) : null;
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

  const handleReturnOrder = async () => {
    const finalReason =
      returnReason === "Khác"
        ? returnCustomReason.trim() || "Khác"
        : returnReason;
    try {
      await returnMutation.mutateAsync({
        orderId: detail.id,
        reason: finalReason,
      });
      toast.success("Đã gửi yêu cầu hoàn hàng");
      setShowReturnModal(false);
      setReturnCustomReason("");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Không thể gửi yêu cầu hoàn hàng"
      );
    }
  };

  return (
    <>
      {/* Status */}
      {/* {(() => {
        const StatusIcon = cfg.Icon;
        return (
          <div
            className={`flex max-w-max items-center gap-2 rounded-2xl p-2 ${cfg.bg}`}
          >
            <StatusIcon size={22} className={cfg.color} />
            <p className={`text-sm font-black ${cfg.color}`}>{cfg.label}</p>
          </div>
        );
      })()} */}

      {/* Payment countdown */}
      {detail.status === "pending" &&
        detail.created_at &&
        !detail.deposit_percentage && (
          <PaymentCountdown createdAt={detail.created_at} />
        )}

      {/* Status timeline */}
      <OrderTrackingTimeline order={detail} />

      {/* Return request reason (returning) */}
      {detail.status === "returning" && detail.returning_reason && (
        <div className="space-y-1 rounded-2xl bg-surface-container px-4 py-3">
          <p className="text-sm font-black uppercase tracking-widest text-on-surface-variant">
            Lý do hoàn hàng
          </p>
          <p className="text-xs leading-relaxed text-on-surface">
            {detail.returning_reason}
          </p>
        </div>
      )}

      {/* Returning notice */}
      {detail.status === "returning" && (
        <div className="flex items-start gap-2 rounded-2xl border border-amber-300/40 bg-amber-50 px-4 py-3">
          <p className="text-xs leading-relaxed text-amber-800">
            <span className="text-sm font-bold">Lưu ý khi hoàn hàng</span>
            <br />
            Bạn cần hoàn trả đơn hàng này về cho shop và đợi xác minh đơn hàng
            trước khi nhận lại tiền hoàn. Vui lòng liên hệ shop nếu có thắc mắc.
          </p>
        </div>
      )}

      {/* Return address (returning) */}
      {detail.status === "returning" && (
        <div className="space-y-2">
          <p className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-on-surface-variant">
            Địa chỉ hoàn hàng
          </p>
          <div className="space-y-4 rounded-2xl bg-surface-container p-4">
            <div>
              <p className="flex items-center gap-2 text-sm font-bold text-on-surface">
                <MapPin size={16} className="text-primary" />
                Noobstore HCM - 083 922 0900
              </p>
              <p className="pl-6 text-sm leading-relaxed text-on-surface-variant">
                70/4b Đường 47 phường Hiệp Bình Chánh TP. Thủ Đức TP. Hồ Chí
                Minh
              </p>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(RETURN_ADDRESS_TEXT);
                  setAddressCopied(true);
                  setTimeout(() => setAddressCopied(false), 2000);
                }}
                className="ml-6 flex w-max items-center gap-1 text-xs font-bold text-primary underline underline-offset-1 transition-opacity active:opacity-70"
              >
                {addressCopied ? "Đã sao chép ✓" : "Sao chép địa chỉ"}
              </button>
            </div>
            <div className="mt-2 flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2">
              <p className="text-xs leading-relaxed text-amber-800">
                Vui lòng ghi số đơn hàng{" "}
                <span className="font-bold">{detail.order_number}</span> vào bên
                ngoài gói hàng để shop xác minh nhanh hơn.
              </p>
            </div>
          </div>
        </div>
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

      {/* Order items */}
      {detail.items.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-black uppercase tracking-widest text-on-surface-variant">
              Sản phẩm ({detail.items.length})
            </p>
            {isSupportAvailable && (
              <div className="flex items-center gap-2">
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
              </div>
            )}
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
                      sizes="96px"
                      className="rounded-xl object-cover"
                    />
                  ) : (
                    <PackageCheck size={24} className="text-outline-variant" />
                  )}
                  {item.isPreOrder ||
                  item.components.some((c) => c.is_pre_order) ? (
                    <span className="absolute -top-2 left-1/2 z-10 min-w-14 -translate-x-1/2 whitespace-nowrap rounded-sm bg-violet-500 px-1 py-0.5 text-center text-[8px] font-black uppercase text-white">
                      Pre-order
                    </span>
                  ) : null}
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

      {/* Pickup recipient — pickup orders carry only name + phone (no address) */}
      {isPickup &&
        (pickupRecipient?.full_name || pickupRecipient?.phone_number) && (
          <div className="space-y-1 rounded-2xl bg-surface-container p-4">
            <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
              Người nhận
            </p>
            <p className="text-sm font-bold text-on-surface">
              {pickupRecipient?.full_name}{" "}
              {pickupRecipient?.phone_number ? (
                <span className="font-normal text-on-surface-variant">
                  · {pickupRecipient.phone_number}
                </span>
              ) : null}
            </p>
          </div>
        )}

      {/* Pickup information */}
      {detail.pickup_at && (
        <div className="space-y-2">
          <p className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-on-surface-variant">
            Thông tin nhận hàng
          </p>
          <div className="space-y-1 rounded-2xl bg-surface-container p-4">
            <p className="text-sm font-bold text-on-surface">
              Nhận tại cửa hàng — Noobstore HCM
            </p>
            <p className="text-sm text-on-surface-variant">
              {new Date(detail.pickup_at).toLocaleString("vi-VN", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        </div>
      )}

      {/* Pickup verification — one-time pickup code */}
      {isPickup && detail.pickup_verified_at && (
        <div className="space-y-2">
          <p className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-on-surface-variant">
            Xác nhận nhận hàng
          </p>
          <div className="flex items-center gap-3 rounded-2xl bg-emerald-50 p-4">
            <CheckCircle2 className="h-6 w-6 flex-shrink-0 text-emerald-600" />
            <div>
              <p className="text-sm font-bold text-emerald-700">
                Đã xác nhận nhận hàng tại cửa hàng
              </p>
              <p className="text-xs text-emerald-600">
                {new Date(detail.pickup_verified_at).toLocaleString("vi-VN", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>
        </div>
      )}

      {isPickup &&
        !detail.pickup_verified_at &&
        (detail.payment_type === "deposit_cod"
          ? detail.status === "second_paid"
          : detail.status === "confirmed") && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-on-surface-variant">
                Mã nhận hàng
              </p>
              {activePickupCode && pickupCodeSecondsLeft > 0 && (
                <span className="flex items-center gap-1 text-xs font-bold tabular-nums text-rose-600">
                  <Timer className="h-3.5 w-3.5" />
                  {String(Math.floor(pickupCodeSecondsLeft / 60)).padStart(
                    2,
                    "0"
                  )}
                  :{String(pickupCodeSecondsLeft % 60).padStart(2, "0")}
                </span>
              )}
            </div>
            <div className="rounded-2xl bg-surface-container p-4">
              {activePickupCode && pickupCodeSecondsLeft > 0 ? (
                <>
                  <p className="text-center text-sm font-semibold text-on-surface">
                    Xuất trình mã này cho nhân viên tại cửa hàng
                  </p>
                  <p className="my-3 select-all text-center text-4xl font-black tracking-[0.35em] text-on-surface">
                    {activePickupCode.code}
                  </p>
                  <p className="text-center text-[11px] text-on-surface-variant">
                    Kèm theo CMND/CCCD để đối chiếu khi nhận hàng
                  </p>
                  <div className="divider my-3" />
                  <button
                    type="button"
                    className="btn btn-outline btn-primary btn-sm w-full"
                    onClick={handleShowPickupCode}
                    disabled={
                      pickupMutation.isPending || pickupWaitSecondsLeft > 0
                    }
                  >
                    <RefreshCw className="h-4 w-4" />
                    {pickupMutation.isPending
                      ? "Đang tạo…"
                      : pickupWaitSecondsLeft > 0
                        ? `Tạo mã mới (${formatCountdown(pickupWaitSecondsLeft)})`
                        : "Tạo mã mới"}
                  </button>
                </>
              ) : (
                <>
                  <p className="mb-3 text-sm text-on-surface-variant">
                    Tạo mã để nhân viên xác nhận khi bạn tới nhận hàng. Mã chỉ
                    dùng một lần và có hiệu lực 5 phút.
                  </p>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm w-full"
                    onClick={handleShowPickupCode}
                    disabled={
                      pickupMutation.isPending || pickupWaitSecondsLeft > 0
                    }
                  >
                    <ShieldCheck className="h-4 w-4" />
                    {pickupMutation.isPending
                      ? "Đang tạo…"
                      : pickupWaitSecondsLeft > 0
                        ? `Chờ ${formatCountdown(pickupWaitSecondsLeft)}`
                        : "Hiển thị mã nhận hàng"}
                  </button>
                </>
              )}
            </div>
          </div>
        )}

      {/* Delivery information */}
      {!isPickup && !detail.pickup_at && detail.delivery_address && (
        <div className="space-y-2">
          <p className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-on-surface-variant">
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
              {(isCarrierMethod
                ? [
                    detail.delivery_address.apartment,
                    detail.delivery_address.street_address,
                    detail.delivery_address.ward,
                    detail.delivery_address.district,
                    detail.delivery_address.city,
                  ]
                : [
                    detail.delivery_address.apartment,
                    detail.delivery_address.street_address,
                  ]
              )
                .filter(Boolean)
                .join(", ")}
            </p>
            {detail.delivery_address.notes ? (
              <p className="space-x-1">
                <strong className="text-sm">Ghi chú:</strong>
                <small>{detail.delivery_address.notes}</small>
              </p>
            ) : null}
          </div>
        </div>
      )}

      {/* Shipment tracking */}
      {isCarrierMethod &&
        detail.tracking_number &&
        detail.carriers &&
        detail.carriers.name && (
          <div className="space-y-2">
            <p className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-on-surface-variant">
              Theo dõi vận chuyển
            </p>
            <div className="flex items-start gap-2 rounded-2xl bg-surface-container p-4">
              <div className="relative h-14 min-w-14">
                <Image
                  src={detail.carriers.logo || NOT_FOUND_IMAGE}
                  alt={detail.carriers.name}
                  className="shrink-0 rounded-full bg-surface-container-high"
                  fill
                  sizes="56px"
                  objectFit="cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-bold text-on-surface">
                    {detail.carriers.name}
                  </p>
                  {buildTrackingUrl(
                    detail.carriers.tracking_url_template,
                    detail.tracking_number
                  ) && (
                    <a
                      href={
                        buildTrackingUrl(
                          detail.carriers.tracking_url_template,
                          detail.tracking_number
                        ) ?? "#"
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-medium text-primary underline underline-offset-1"
                    >
                      Kiêm tra trên {detail.carriers.name}
                    </a>
                  )}
                </div>
                <p className="mt-0.5 flex items-center gap-2">
                  <span className="truncate font-mono text-xs text-on-surface-variant">
                    {detail.tracking_number}
                  </span>
                  <CopyToClipboardButton
                    value={detail.tracking_number}
                    label="mã vận đơn"
                  />
                </p>
              </div>
            </div>
          </div>
        )}

      {/* Payment panel — keep QR/payment info for deposit orders until the
          order is fully paid; hide once paid or on cancel/refund. */}
      {!detail.paid_at &&
        !["cancelled", "refunded"].includes(detail.status) && (
          <OrderPaymentPanel
            orderNumber={detail.order_number}
            totalPrice={detail.total_price}
            shippingFee={detail.shipping_fee}
            shippingMethodId={detail.shipping_method_id}
            voucherDiscount={voucherDiscount}
            shippingDiscount={shippingDiscount}
            paymentType={detail.payment_type}
            depositAmount={detail.deposit_amount ?? 0}
            remainingAmount={detail.remaining_amount ?? 0}
            depositPercentage={detail.deposit_percentage ?? 0}
            depositPaid={
              detail.payment_type === "deposit_cod" &&
              detail.deposit_paid_at != null
            }
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

      {/* Deposit/COD breakdown is separate from the order total for easier scanning. */}
      {detail.payment_type === "deposit_cod" && (
        <section
          aria-label="Chi tiết thanh toán"
          className="space-y-3 rounded-2xl border border-primary/15 bg-primary/5 px-4 py-3"
        >
          <h3 className="text-xs font-black uppercase tracking-widest text-on-surface-variant">
            Thanh toán
          </h3>
          <div className="flex items-center justify-between gap-4 text-sm">
            <span className="text-on-surface-variant">
              {detail.deposit_paid_at ? "Đã đặt cọc" : "Đặt cọc"} (
              {detail.deposit_percentage ?? 0}%)
            </span>
            <span className="font-bold tabular-nums text-primary">
              {formatVND(detail.deposit_amount ?? 0)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4 text-sm">
            <span className="text-on-surface-variant">Còn lại (COD)</span>
            <span className="font-bold tabular-nums text-secondary">
              {formatVND(detail.remaining_amount ?? 0)}
            </span>
          </div>
        </section>
      )}

      {/* Price summary */}
      {[
        "confirmed",
        "first_paid",
        "second_paid",
        "delivering",
        "delivered",
        "returning",
      ].includes(detail.status) && (
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
              {shippingFeePending
                ? "Cập nhật sau"
                : formatVND(detail.shipping_fee)}
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
        [
          "confirmed",
          "second_paid",
          "delivering",
          "delivered",
          "returning",
        ].includes(detail.status) && (
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

      {/* Return request button */}
      {canRequestReturn ? (
        <button
          onClick={() => setShowReturnModal(true)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-amber-400/50 bg-amber-50 py-3 text-sm font-black uppercase tracking-wider text-amber-700 transition-all active:scale-[0.98]"
        >
          <RotateCcw size={16} />
          Hoàn hàng / Trả tiền
        </button>
      ) : isPickupReturnBlocked ? (
        <button
          type="button"
          disabled
          className="flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-2xl border border-amber-400/30 bg-amber-50/50 py-3 text-sm font-black uppercase tracking-wider text-amber-700/40"
        >
          <RotateCcw size={16} />
          Đơn hàng không hỗ trợ hoàn tiền
        </button>
      ) : null}

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

      {/* Cancel confirmation modal */}
      <dialog
        onCancel={(e) => e.preventDefault()}
        className={`modal !mt-0 ${showCancelModal ? "modal-open" : ""}`}
      >
        <div className="modal-box rounded-2xl">
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
              className="w-full rounded-lg bg-surface-container px-4 py-3 text-sm text-on-surface outline-none transition-all focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="modal-action flex">
            <button
              disabled={cancelMutation.isPending}
              onClick={() => setShowCancelModal(false)}
              className="btn btn-sm flex-1 rounded-lg border-0 bg-surface-container px-4 text-sm font-bold normal-case text-on-surface"
            >
              Đóng
            </button>
            <button
              onClick={handleCancelOrder}
              disabled={cancelMutation.isPending}
              className="btn btn-sm flex-1 rounded-lg border-0 bg-error px-4 text-sm font-bold normal-case text-white transition-all active:scale-[0.98] disabled:opacity-60"
            >
              {cancelMutation.isPending ? (
                <span className="loading loading-spinner loading-sm" />
              ) : (
                "Hủy đơn"
              )}
            </button>
          </div>
        </div>
        <div className="modal-backdrop" />
      </dialog>

      {/* Return request modal */}
      <dialog
        onCancel={(e) => e.preventDefault()}
        className={`modal !mt-0 ${showReturnModal ? "modal-open" : ""}`}
      >
        <div className="modal-box rounded-2xl">
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
              <RotateCcw size={24} className="text-amber-600" />
            </div>
            <p className="text-lg font-black text-on-surface">
              Hoàn hàng / Trả tiền
            </p>
            <p className="text-sm text-on-surface-variant">
              Bạn có chắc chắn muốn yêu cầu hoàn hàng cho đơn{" "}
              <span className="font-bold text-on-surface">
                {detail.order_number}
              </span>
              ? Gói hàng cần được cửa hàng xác minh trước khi tiền được hoàn về.
            </p>
          </div>
          <div className="mt-4 space-y-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
              Lý do hoàn hàng (bắt buộc)
            </p>
            <div className="flex flex-wrap gap-2">
              {RETURN_REASON_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  onClick={() => setReturnReason(opt)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-all active:scale-95 ${
                    returnReason === opt
                      ? "border-amber-400 bg-amber-100 text-amber-700"
                      : "border-outline-variant/40 bg-surface-container text-on-surface-variant"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
            {returnReason === "Khác" && (
              <textarea
                value={returnCustomReason}
                onChange={(e) => setReturnCustomReason(e.target.value)}
                placeholder="Mô tả lý do hoàn hàng..."
                rows={3}
                className="w-full rounded-2xl bg-surface-container px-4 py-3 text-sm text-on-surface outline-none transition-all focus:ring-2 focus:ring-primary"
              />
            )}
          </div>
          <div className="modal-action grid grid-cols-2 gap-2">
            <button
              disabled={returnMutation.isPending}
              onClick={() => setShowReturnModal(false)}
              className="btn rounded-md border-0 bg-surface-container px-6 text-sm font-bold normal-case text-on-surface"
            >
              Đóng
            </button>
            <button
              onClick={handleReturnOrder}
              disabled={
                returnMutation.isPending ||
                (returnReason === "Khác" && !returnCustomReason.trim())
              }
              className="btn rounded-md border-0 bg-amber-500 px-6 text-sm font-bold normal-case text-white transition-all active:scale-[0.98] disabled:opacity-60"
            >
              {returnMutation.isPending ? (
                <span className="loading loading-spinner loading-sm" />
              ) : (
                "Hoàn hàng"
              )}
            </button>
          </div>
        </div>
        <div className="modal-backdrop" />
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
  usePreventScroll(isOpen);

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden="true"
        className={`fixed inset-0 z-[60] !mt-0 bg-on-surface/30 backdrop-blur-sm transition-opacity duration-300 lg:transition-opacity ${
          isOpen
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        }`}
      />

      {/* Drawer */}
      <div
        role="dialog"
        aria-modal={isOpen ? true : undefined}
        aria-label="Chi tiết đơn hàng"
        aria-hidden={!isOpen}
        inert={!isOpen}
        className={`duration-250 fixed left-0 right-0 z-[999] !mt-0 flex h-dvh max-h-dvh flex-col rounded-t-5xl bg-surface transition-all ease-out lg:bottom-0 lg:left-auto lg:right-0 lg:top-0 lg:w-[min(560px,100vw)] lg:rounded-none lg:shadow-2xl lg:transition-transform ${
          isOpen ? "bottom-0 lg:translate-x-0" : "-bottom-full lg:translate-x-full"
        }`}
      >
        {/* Handle */}
        <div className="flex flex-shrink-0 justify-center pb-1 pt-3 lg:hidden">
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
        <div className="flex-1 touch-pan-y space-y-4 overflow-y-auto p-4">
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
