"use client";

import { useIsMounted } from "@/hooks/useIsMounted";
import { formatVND } from "@/lib/currency";
import { isShippingReward } from "@/lib/voucher-discount";
import type { VoucherRow } from "@/types/voucher";
import {
  BadgePercent,
  CalendarClock,
  CheckCircle2,
  Gift,
  Sparkles,
  TicketPercent,
  Truck,
} from "lucide-react";
import { memo, useMemo } from "react";

interface VoucherCardProps {
  voucher: VoucherRow;
  isApplied: boolean;
  isApplying: boolean;
  isValid: boolean;
  subtotal?: number;
  onApply?: () => void;
}

export const VoucherCard = memo(function VoucherCard({
  voucher,
  isApplied,
  isApplying,
  isValid,
  subtotal,
  onApply,
}: VoucherCardProps) {
  const shippingScoped = isShippingReward(voucher.reward_type);

  const rewardIcon = useMemo(() => {
    if (shippingScoped) return Truck;
    if (voucher.reward_type === "percent_off") return BadgePercent;
    if (voucher.reward_type === "amount_off") return TicketPercent;
    if (voucher.reward_type === "gift_item") return Gift;
    return Sparkles;
  }, [voucher.reward_type, shippingScoped]);

  const rewardLabel = useMemo(() => {
    if (voucher.reward_type === "free_shipping") {
      return "Miễn phí vận chuyển";
    }
    if (voucher.reward_type === "shipping_percent_off") {
      return `Giảm ${voucher.percent_off ?? 0}% phí vận chuyển`;
    }
    if (voucher.reward_type === "shipping_amount_off") {
      return `Giảm ${formatVND(voucher.amount_off ?? 0)} phí vận chuyển`;
    }
    if (voucher.reward_type === "percent_off") {
      return `Giảm ${voucher.percent_off ?? 0}%`;
    }
    if (voucher.reward_type === "amount_off") {
      return `Giảm ${formatVND(voucher.amount_off ?? 0)}`;
    }
    if (voucher.reward_type === "gift_item") {
      return "Tặng quà kèm";
    }
    return "Khuyến mãi";
  }, [voucher, shippingScoped]);

  const stubTag = useMemo(() => {
    if (shippingScoped) return "VẬN CHUYỂN";
    if (voucher.reward_type === "gift_item") return "QUÀ TẶNG";
    return "GIẢM GIÁ";
  }, [shippingScoped, voucher.reward_type]);

  const validityLabel = useMemo(() => {
    if (!voucher.end_at) return null;
    const endDate = new Date(voucher.end_at);
    if (Number.isNaN(endDate.getTime())) return null;
    return endDate.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }, [voucher.end_at]);

  const isMounted = useIsMounted();
  const RewardIcon = rewardIcon;

  const getInvalidReason = (): string => {
    if (voucher.status !== "active" || voucher.deleted_at) {
      return "Voucher đã bị hủy";
    }

    const now = new Date();
    if (voucher.start_at) {
      const startDate = new Date(voucher.start_at);
      if (now < startDate) return "Voucher chưa bắt đầu";
    }
    if (voucher.end_at) {
      const endDate = new Date(voucher.end_at);
      if (now > endDate) return "Voucher đã hết hạn";
    }

    if (
      voucher.min_order_amount > 0 &&
      (typeof subtotal === "undefined" || subtotal < voucher.min_order_amount)
    ) {
      return `Chưa đạt đơn tối thiểu ${formatVND(voucher.min_order_amount)}`;
    }

    return "Không đủ điều kiện áp dụng";
  };

  return (
    <div
      className={`group relative flex items-stretch overflow-hidden rounded-2xl border transition-all duration-200 ${
        isApplied
          ? "border-emerald-500/40 bg-emerald-500/5 shadow-ambient-sm"
          : isValid
            ? "border-outline-variant/25 bg-surface hover:border-primary/40 hover:shadow-ambient-sm"
            : "border-dashed border-outline-variant/30 bg-surface-container/20"
      }`}
    >
      {/* Left Stub: Coupon Type Badge & Notch */}
      <div
        className={`relative flex w-24 flex-shrink-0 flex-col items-center justify-center p-3 text-center sm:w-28 ${
          isApplied
            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
            : isValid
              ? shippingScoped
                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                : "bg-primary/10 text-primary"
              : "bg-surface-container text-on-surface-variant"
        }`}
      >
        <div className="shadow-xs grid h-10 w-10 place-items-center rounded-xl bg-surface">
          <RewardIcon size={22} className="stroke-[2.2]" />
        </div>
        <span className="mt-2 text-[10px] font-black uppercase tracking-wider">
          {stubTag}
        </span>
        {voucher.code && (
          <span className="mt-0.5 line-clamp-1 max-w-full px-1 font-mono text-[9px] font-bold text-on-surface-variant">
            {voucher.code}
          </span>
        )}

        {/* Dashed Right Border Divider */}
        <div className="absolute bottom-2 right-0 top-2 border-r border-dashed border-outline-variant/40" />

        {/* Top & Bottom Circular Notches */}
        <div className="absolute -right-2 -top-2 h-4 w-4 rounded-full bg-surface-container-high/60 ring-1 ring-outline-variant/20" />
        <div className="absolute -bottom-2 -right-2 h-4 w-4 rounded-full bg-surface-container-high/60 ring-1 ring-outline-variant/20" />
      </div>

      {/* Right Content & Actions */}
      <div className="flex min-w-0 flex-1 flex-col justify-between p-3.5 sm:p-4">
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span
                className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${
                  shippingScoped
                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                    : voucher.reward_type === "gift_item"
                      ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                      : "bg-primary/10 text-primary"
                }`}
              >
                {shippingScoped
                  ? "Phí vận chuyển"
                  : voucher.reward_type === "gift_item"
                    ? "Quà tặng"
                    : "Đơn hàng / Sản phẩm"}
              </span>
              <h4 className="text-sm font-black text-on-surface">
                {rewardLabel}
              </h4>
            </div>

            {/* Action button in header position if valid */}
            {isApplied ? (
              <span className="shadow-xs inline-flex shrink-0 items-center gap-1 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white">
                <CheckCircle2 size={14} className="stroke-[2.5]" />
                Đã dùng
              </span>
            ) : isValid ? (
              <button
                type="button"
                onClick={onApply}
                disabled={isApplying}
                className="shadow-xs btn btn-primary btn-sm h-8 min-h-[32px] shrink-0 rounded-xl px-4 text-xs font-bold text-surface transition-all active:scale-95"
              >
                {isApplying ? (
                  <span className="loading loading-spinner loading-xs" />
                ) : (
                  "Áp dụng"
                )}
              </button>
            ) : null}
          </div>

          {voucher.description && (
            <p className="text-xs leading-relaxed text-on-surface-variant">
              {voucher.description}
            </p>
          )}

          {!isValid && isMounted && (
            <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-2.5 py-1.5 text-[11px] font-bold text-rose-700 dark:text-rose-300">
              ⚠️ {getInvalidReason()}
            </div>
          )}

          {/* Always visible clear condition details */}
          <div className="space-y-1.5 rounded-xl border border-outline-variant/20 bg-surface-container/40 p-2.5 text-[11px] text-on-surface-variant">
            <div className="flex items-start gap-1.5">
              <span className="shrink-0 font-bold text-on-surface">
                Áp dụng cho:
              </span>
              <span>
                {shippingScoped
                  ? "Giảm trừ trực tiếp vào phí vận chuyển"
                  : voucher.reward_type === "gift_item"
                    ? "Tặng sản phẩm kèm theo đơn hàng"
                    : "Giảm trực tiếp vào tổng tiền hàng"}
              </span>
            </div>
            <div className="flex items-start gap-1.5">
              <span className="shrink-0 font-bold text-on-surface">
                Đơn tối thiểu:
              </span>
              <span className="font-semibold text-on-surface">
                {voucher.min_order_amount > 0
                  ? formatVND(voucher.min_order_amount)
                  : "Không yêu cầu"}
              </span>
            </div>
            {voucher.max_discount_amount && voucher.max_discount_amount > 0 ? (
              <div className="flex items-start gap-1.5">
                <span className="shrink-0 font-bold text-on-surface">
                  Giảm tối đa:
                </span>
                <span>{formatVND(voucher.max_discount_amount)}</span>
              </div>
            ) : null}
            {voucher.usage_limit_per_user && (
              <div className="flex items-start gap-1.5">
                <span className="shrink-0 font-bold text-on-surface">
                  Giới hạn:
                </span>
                <span>{voucher.usage_limit_per_user} lần/khách hàng</span>
              </div>
            )}
            {validityLabel && (
              <div className="flex items-start gap-1.5">
                <span className="shrink-0 font-bold text-on-surface">
                  Hạn sử dụng:
                </span>
                <span>{validityLabel}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});
