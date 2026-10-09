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
import { useMemo } from "react";
import { VoucherApplyButton } from "./VoucherApplyButton";

interface VoucherCardProps {
  voucher: VoucherRow;
  isApplied: boolean;
  isApplying: boolean;
  isValid: boolean;
  subtotal?: number;
  onApply?: () => void;
}

export function VoucherCard({
  voucher,
  isApplied,
  isApplying,
  isValid,
  subtotal,
  onApply,
}: VoucherCardProps) {
  // Shipping reward types carry scope_type 'order_total'; the reward type
  // alone says the discount lands on the shipping fee.
  const shippingScoped = isShippingReward(voucher.reward_type);

  const rewardIcon = useMemo(() => {
    // A shipping voucher always gets the truck — the icon should say what the
    // discount is on, not how it's coded.
    if (shippingScoped) {
      return Truck;
    }
    if (voucher.reward_type === "percent_off") {
      return BadgePercent;
    }
    if (voucher.reward_type === "amount_off") {
      return TicketPercent;
    }
    if (voucher.reward_type === "gift_item") {
      return Gift;
    }
    return Sparkles;
  }, [voucher.reward_type, shippingScoped]);

  const rewardLabel = useMemo(() => {
    if (voucher.reward_type === "free_shipping") {
      return "Miễn phí vận chuyển";
    }
    // Shipping reward types discount the shipping fee, not the cart — say
    // which, or "Giảm 50%" reads as 50% off the order.
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

  const scopeLabel = useMemo(() => {
    if (shippingScoped) {
      return "Áp dụng cho phí vận chuyển";
    }
    if (voucher.scope_type === "order_total") {
      return "Áp dụng cho toàn bộ đơn hàng";
    }
    if (voucher.scope_type === "product") {
      return "Áp dụng cho sản phẩm chỉ định";
    }
    if (voucher.scope_type === "category") {
      return "Áp dụng theo danh mục sản phẩm";
    }
    return "Khuyến mãi đặc biệt";
  }, [voucher.scope_type]);

  const validityLabel = useMemo(() => {
    if (!voucher.end_at) {
      return null;
    }

    const endDate = new Date(voucher.end_at);
    if (Number.isNaN(endDate.getTime())) {
      return null;
    }

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
      return `Tối thiểu ${formatVND(voucher.min_order_amount)}`;
    }

    return "Không khả dụng";
  };

  return (
    <div
      className={`overflow-hidden rounded-2xl border border-primary/15 bg-gradient-to-br from-white via-surface-container-low to-primary/5 shadow-[0_16px_50px_rgba(15,23,42,0.08)] transition-opacity ${!isValid ? "opacity-50" : ""}`}
    >
      <div
        className={`border-b border-primary/10 bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,0.16),transparent_42%),linear-gradient(135deg,rgba(255,255,255,0.98),rgba(244,247,255,0.96))] p-4 ${!isValid ? "bg-opacity-50" : ""}`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-start gap-2">
            <div
              className={`mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-primary text-white shadow-lg shadow-primary/20 ${!isValid ? "opacity-50" : ""}`}
            >
              <RewardIcon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="line-clamp-2 text-sm font-black leading-tight text-on-surface">
                {rewardLabel}
              </p>
              {!isValid && isMounted ? (
                <p className="mt-1 text-xs font-bold leading-5 text-warning">
                  ❌ {getInvalidReason()}
                </p>
              ) : voucher.description ? (
                <p className="line-clamp-3 text-xs leading-5 text-on-surface-variant">
                  {voucher.description}
                </p>
              ) : null}
            </div>
          </div>
          <div className="flex min-w-24 flex-col items-end gap-2">
            {isApplied ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold uppercase text-green-700">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Áp dụng
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="space-y-3 p-4">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <div className="rounded-2xl bg-surface-container px-3 py-2.5">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-on-surface-variant">
              Loại ưu đãi
            </p>
            <p className="mt-1 text-sm font-bold text-on-surface">
              {scopeLabel}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-full rounded-2xl bg-surface-container px-3 py-2.5">
              <p className="text-[8px] font-black uppercase tracking-[0.22em] text-on-surface-variant">
                Đơn tối thiểu
              </p>
              <p className="mt-1 text-sm font-bold text-on-surface">
                {voucher.min_order_amount > 0
                  ? formatVND(voucher.min_order_amount)
                  : "Không yêu cầu"}
              </p>
            </div>
            {voucher.max_discount_amount &&
            parseFloat(String(voucher.max_discount_amount)) > 0 ? (
              <div className="w-full rounded-2xl bg-surface-container px-3 py-2.5">
                <p className="text-[8px] font-black uppercase tracking-[0.22em] text-on-surface-variant">
                  Giảm tối đa
                </p>
                <p className="mt-1 text-sm font-bold text-on-surface">
                  {formatVND(parseFloat(String(voucher.max_discount_amount)))}
                </p>
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {voucher.stackable ? (
            <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-bold text-emerald-700">
              Có thể sử dụng cùng mã giảm giá khác
            </span>
          ) : (
            <span className="rounded-full border border-outline-variant/50 bg-surface-container-low px-3 py-1 text-[11px] font-bold text-on-surface-variant">
              Không được sử dụng cùng mã giảm giá khác
            </span>
          )}
          {voucher.usage_limit_per_user ? (
            <span className="rounded-full border border-outline-variant/50 bg-surface-container-low px-3 py-1 text-[11px] font-bold text-on-surface-variant">
              Tối đa {voucher.usage_limit_per_user} lần / tài khoản
            </span>
          ) : null}
        </div>

        {validityLabel ? (
          <div className="flex items-center gap-2 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-800">
            <CalendarClock className="h-4 w-4 flex-shrink-0" />
            Có hiệu lực đến {validityLabel}
          </div>
        ) : null}

        <VoucherApplyButton
          isApplied={isApplied}
          isApplying={isApplying}
          isValid={isValid}
          onClick={onApply}
        />
      </div>
    </div>
  );
}
