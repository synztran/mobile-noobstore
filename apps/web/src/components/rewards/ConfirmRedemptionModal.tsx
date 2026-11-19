"use client";

import type { RewardItem } from "@/types/reward";
import { formatVND } from "@/lib/currency";
import {
  AlertCircle,
  BadgePercent,
  CheckCircle2,
  Clock,
  Package,
  Sparkles,
  Ticket,
  Wallet,
  X,
} from "lucide-react";
import { formatPoints, getRewardIcon } from "./utils";

interface Props {
  reward: RewardItem | null;
  isPending: boolean;
  balance: number;
  dailyCheckinBalance?: number;
  onClose: () => void;
  onConfirm: (id: string) => void;
}

export function ConfirmRedemptionModal({
  reward,
  isPending,
  balance,
  dailyCheckinBalance = 0,
  onClose,
  onConfirm,
}: Props) {
  if (!reward) return null;

  const isCheckin = reward.pointsCurrency === "daily_checkin";
  const userBalance = isCheckin ? dailyCheckinBalance : balance;
  const currencyName = isCheckin ? "chuyên cần" : "NSP";
  const canAfford = userBalance >= reward.pointsCost;
  const isSoldOut =
    reward.stock !== null && reward.claimedCount >= reward.stock;
  const shortage = Math.max(0, reward.pointsCost - userBalance);
  const remainingStock =
    reward.stock === null
      ? "Không giới hạn"
      : `${Math.max(0, reward.stock - reward.claimedCount)} lượt`;

  const m = reward.metadata ?? {};
  const rt = (m.reward_type as string) || "";
  const scopeType = (m.scope_type as string) || "order_total";
  const amountOff = typeof m.amount_off === "number" ? m.amount_off : null;
  const percentOff = typeof m.percent_off === "number" ? m.percent_off : null;
  const maxDiscount =
    typeof m.max_discount_amount === "number" ? m.max_discount_amount : null;
  const minOrder =
    typeof m.min_order_amount === "number" ? m.min_order_amount : 0;

  // 1. Loại voucher
  let typeLabel = "Voucher ưu đãi";
  if (rt === "free_shipping") {
    typeLabel = "Miễn phí vận chuyển";
  } else if (rt === "shipping_amount_off" || rt === "shipping_percent_off") {
    typeLabel = "Giảm giá phí vận chuyển";
  } else if (rt === "percent_off") {
    typeLabel = "Giảm theo phần trăm đơn hàng";
  } else if (rt === "amount_off") {
    typeLabel = "Giảm tiền mặt trực tiếp";
  } else if (reward.rewardType === "point") {
    typeLabel = "Đổi điểm thưởng";
  } else if (reward.rewardType === "product") {
    typeLabel = "Quà tặng sản phẩm";
  }

  // 2. Mức giảm (Discount)
  let discountValue = "";
  if (rt === "free_shipping") {
    discountValue = "Miễn phí 100% phí vận chuyển";
  } else if (rt === "percent_off" || rt === "shipping_percent_off") {
    const isShip = rt === "shipping_percent_off";
    discountValue = `Giảm ${percentOff ?? 0}%${isShip ? " phí ship" : ""}`;
    if (maxDiscount && maxDiscount > 0) {
      discountValue += ` (Tối đa ${formatVND(maxDiscount)})`;
    }
  } else if (rt === "amount_off" || rt === "shipping_amount_off") {
    const isShip = rt === "shipping_amount_off";
    discountValue = `Giảm ${formatVND(amountOff ?? 0)}${isShip ? " phí ship" : ""}`;
  } else if (reward.rewardType === "point") {
    discountValue = `Cộng ${(m.point_amount as number) ?? 0} điểm NSP`;
  } else {
    discountValue = reward.name;
  }

  // 3. Yêu cầu điều kiện (Conditions)
  const conditions: string[] = [];
  if (minOrder > 0) {
    conditions.push(`Đơn hàng từ ${formatVND(minOrder)}`);
  } else {
    conditions.push("Mọi đơn hàng (không giới hạn tối thiểu)");
  }
  if (scopeType === "shipping_fee") {
    conditions.push("Chỉ trừ vào phí vận chuyển");
  } else {
    conditions.push("Trừ vào tổng giá trị đơn hàng");
  }

  // 4. Thời hạn sử dụng
  const validity = "90 ngày kể từ ngày đổi";

  return (
    <dialog
      onCancel={(e) => e.preventDefault()}
      aria-labelledby="voucher-detail-title"
      className={`modal modal-bottom sm:modal-middle ${reward ? "modal-open" : ""}`}
    >
      <div className="modal-box w-full max-w-[480px] rounded-2xl bg-surface-container-lowest p-5 shadow-ambient-lg sm:p-6">
        {/* Header bar */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={`rounded-md px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                isCheckin
                  ? "bg-secondary-fixed/50 text-secondary"
                  : "bg-primary-fixed/40 text-primary"
              }`}
            >
              {isCheckin ? "Điểm chuyên cần" : "Điểm NSP"}
            </span>
            <span className="rounded-md bg-surface-container px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-on-surface-variant">
              {reward.rewardType === "point"
                ? "Điểm thưởng"
                : reward.rewardType === "product"
                  ? "Quà tặng"
                  : "Voucher"}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            aria-label="Đóng chi tiết"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-container text-on-surface-variant transition-colors hover:bg-surface-container-high focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X size={16} />
          </button>
        </div>

        {/* Voucher Identity */}
        <div className="mt-3.5 flex items-start gap-3.5 rounded-xl border border-surface-container-high bg-surface-container-low p-3.5">
          <div
            className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl ${
              isCheckin
                ? "bg-secondary-fixed/60 text-secondary"
                : "bg-primary-fixed/40 text-primary"
            }`}
          >
            {getRewardIcon(reward.rewardType, reward.metadata)}
          </div>
          <div className="min-w-0 flex-1">
            <h2
              id="voucher-detail-title"
              className="text-base font-black leading-snug text-on-surface sm:text-lg"
            >
              {reward.name}
            </h2>
            {reward.description && (
              <p className="mt-1 text-xs leading-relaxed text-on-surface-variant">
                {reward.description}
              </p>
            )}
          </div>
        </div>

        {/* Thông tin chi tiết voucher */}
        <div className="mt-4 space-y-2.5">
          <p className="text-xs font-black uppercase tracking-wider text-on-surface-variant">
            Thông tin chi tiết voucher
          </p>
          <div className="space-y-2.5 rounded-xl bg-surface-container-low p-3.5 sm:p-4">
            {/* Loại voucher */}
            <div className="flex items-start justify-between gap-3 text-sm">
              <span className="flex items-center gap-2 font-medium text-on-surface-variant">
                <Ticket size={16} className="shrink-0 text-primary" />
                <span>Loại ưu đãi</span>
              </span>
              <span className="text-right font-bold text-on-surface">
                {typeLabel}
              </span>
            </div>

            {/* Mức giảm */}
            <div className="flex items-start justify-between gap-3 border-t border-surface-container-high/60 pt-2.5 text-sm">
              <span className="flex items-center gap-2 font-medium text-on-surface-variant">
                <BadgePercent size={16} className="shrink-0 text-success" />
                <span>Mức giảm</span>
              </span>
              <span className="text-right font-black text-primary sm:text-base">
                {discountValue}
              </span>
            </div>

            {/* Yêu cầu điều kiện (Multi-line block) */}
            <div className="border-t border-surface-container-high/60 pt-2.5">
              <div className="mb-2 flex items-center gap-2 text-on-surface-variant">
                <CheckCircle2 size={16} className="shrink-0 text-amber-500" />
                <span className="text-xs font-bold uppercase tracking-wider">
                  Điều kiện áp dụng
                </span>
              </div>
              <div className="space-y-1.5 pl-6">
                {conditions.map((cond, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-1.5 text-xs leading-snug text-on-surface sm:text-sm"
                  >
                    <span className="font-black text-primary select-none">•</span>
                    <span className="font-medium">{cond}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Thời hạn sử dụng */}
            <div className="flex items-start justify-between gap-3 border-t border-surface-container-high/60 pt-2.5 text-sm">
              <span className="flex items-center gap-2 font-medium text-on-surface-variant">
                <Clock size={16} className="shrink-0 text-sky-500" />
                <span>Thời hạn sử dụng</span>
              </span>
              <span className="text-right font-bold text-on-surface">
                {validity}
              </span>
            </div>

            {/* Số lượng */}
            <div className="flex items-start justify-between gap-3 border-t border-surface-container-high/60 pt-2.5 text-sm">
              <span className="flex items-center gap-2 font-medium text-on-surface-variant">
                <Package size={16} className="shrink-0 text-violet-500" />
                <span>Số lượng khả dụng</span>
              </span>
              <span className="text-right font-bold text-on-surface">
                {remainingStock}
              </span>
            </div>
          </div>
        </div>

        {/* Điểm cần đổi & Số dư */}
        <div className="mt-3.5 rounded-xl border border-surface-container-high bg-surface-container-low p-3.5 sm:p-4">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="flex items-center gap-2 font-medium text-on-surface-variant">
              <Wallet size={16} className="shrink-0 text-amber-500" />
              <span>Số dư hiện tại</span>
            </span>
            <span className="font-extrabold text-on-surface sm:text-base">
              {formatPoints(userBalance).replace(/ điểm$/, "")} {currencyName}
            </span>
          </div>

          <div className="mt-2.5 flex items-center justify-between gap-3 text-sm">
            <span className="font-medium text-on-surface-variant">Số điểm cần đổi</span>
            <span className="font-black text-primary sm:text-base">
              −{formatPoints(reward.pointsCost).replace(/ điểm$/, "")}{" "}
              {currencyName}
            </span>
          </div>

          <div className="my-2.5 h-px bg-surface-container-high" />

          {canAfford && (
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="font-bold text-on-surface">
                Số dư sau khi đổi
              </span>
              <span className="font-extrabold text-success sm:text-base">
                {formatPoints(
                  Math.max(0, userBalance - reward.pointsCost)
                ).replace(/ điểm$/, "")}{" "}
                {currencyName}
              </span>
            </div>
          )}

          {!canAfford && !isSoldOut && (
            <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-500">
              <AlertCircle size={14} className="shrink-0" />
              <span>
                Bạn còn thiếu{" "}
                <strong className="font-black">
                  {formatPoints(shortage).replace(/ điểm$/, "")}
                </strong>{" "}
                {currencyName} để đổi voucher này.
              </span>
            </div>
          )}

          {isSoldOut && (
            <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-500">
              <AlertCircle size={14} className="shrink-0" />
              <span>Phần thưởng này đã hết lượt đổi.</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="flex-1 rounded-full bg-surface-container py-3 text-xs font-black uppercase tracking-wider text-on-surface transition-colors hover:bg-surface-container-high active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Đóng
          </button>
          <button
            type="button"
            onClick={() => onConfirm(reward.id)}
            disabled={isPending || !canAfford || isSoldOut}
            className={`flex-[1.5] rounded-full py-3 text-xs font-black uppercase tracking-wider transition-all active:scale-95 ${
              !canAfford || isSoldOut
                ? "cursor-not-allowed bg-surface-container text-on-surface-variant/50"
                : "primary-gradient text-white hover:opacity-95 disabled:opacity-60"
            }`}
          >
            {isPending ? (
              <span className="loading loading-spinner loading-xs" />
            ) : isSoldOut ? (
              "Đã hết lượt đổi"
            ) : !canAfford ? (
              "Chưa đủ điểm"
            ) : (
              `Xác nhận đổi · ${formatPoints(reward.pointsCost).replace(/ điểm$/, "")}`
            )}
          </button>
        </div>
      </div>
      <div className="modal-backdrop" />
    </dialog>
  );
}
