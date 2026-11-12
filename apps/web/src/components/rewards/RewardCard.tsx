"use client";

import { Wallet } from "lucide-react";
import type { RewardItem } from "@/types/reward";
import { formatPoints, getRewardIcon } from "./utils";

interface Props {
  reward: RewardItem;
  onRedeem: (r: RewardItem) => void;
  balance: number;
  dailyCheckinBalance?: number;
}

export function RewardCard({
  reward,
  onRedeem,
  balance,
  dailyCheckinBalance = 0,
}: Props) {
  const spendable =
    reward.pointsCurrency === "daily_checkin" ? dailyCheckinBalance : balance;
  const canAfford = spendable >= reward.pointsCost;
  const isSoldOut =
    reward.stock !== null && reward.claimedCount >= reward.stock;
  const disabled = !canAfford || isSoldOut;
  const shortage = reward.pointsCost - spendable;
  const stockLabel =
    reward.stock === null
      ? "Không giới hạn"
      : `${Math.max(0, reward.stock - reward.claimedCount)} còn lại`;

  return (
    <div className="flex flex-col gap-2 rounded-2xl bg-surface-container-lowest p-3 shadow-ambient-sm transition-all active:scale-[0.98] lg:min-h-[220px] lg:rounded-xl lg:border lg:border-surface-container-high lg:p-3">
      <div className="hidden items-center justify-between lg:flex">
        <span
          className={`text-sm font-extrabold uppercase tracking-wide ${reward.pointsCurrency === "daily_checkin" ? "text-secondary" : "text-primary"}`}
        >
          {reward.pointsCurrency === "daily_checkin"
            ? "Chuyên cần"
            : reward.rewardType === "point"
              ? "Điểm"
              : reward.rewardType === "product"
                ? "Quà"
                : "Voucher"}
        </span>
        <span className="text-sm text-on-surface-variant">{stockLabel}</span>
      </div>
      <div
        className={`hidden h-[66px] items-center justify-center rounded-lg lg:flex ${reward.pointsCurrency === "daily_checkin" ? "bg-secondary-fixed/60 text-secondary" : "bg-primary-fixed/30 text-primary"}`}
      >
        {reward.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={reward.imageUrl}
            alt=""
            className="h-full w-full rounded-lg object-cover"
          />
        ) : (
          getRewardIcon(reward.rewardType, reward.metadata)
        )}
      </div>
      <div className="flex items-center gap-2 lg:flex-col lg:items-stretch lg:gap-0">
        <div className="flex h-8 min-w-8 items-center justify-center rounded-sm bg-primary-fixed/50 text-primary lg:hidden">
          {getRewardIcon(reward.rewardType, reward.metadata)}
        </div>

        <div className="space-y-1 text-left">
          <div className="max-w-max rounded bg-secondary-fixed/30 px-1.5 py-0.5 text-xs font-black uppercase tracking-widest text-secondary lg:hidden">
            {reward.rewardType === "point"
              ? "ĐIỂM"
              : reward.rewardType === "product"
                ? "QUÀ"
                : "VOUCHER"}
          </div>
          {reward.pointsCurrency === "daily_checkin" && (
            <div className="max-w-max rounded bg-primary-fixed/30 px-1.5 py-0.5 text-xs font-black uppercase tracking-widest text-primary lg:hidden">
              CHUYÊN CẦN
            </div>
          )}
          <p className="truncate text-xs font-black text-on-surface lg:text-sm lg:line-clamp-2 lg:whitespace-normal lg:leading-snug">
            {reward.name}
          </p>
        </div>
      </div>

      {reward.description && (
        <p className="line-clamp-2 text-xs text-on-surface-variant lg:text-xs">
          {reward.description}
        </p>
      )}

      <div className="mt-auto flex flex-col gap-1.5">
        <div className="flex items-center justify-center gap-1 lg:justify-start lg:border-t lg:border-surface-container-high lg:pt-2">
          <Wallet size={11} className="text-amber-500" />
          <span className="text-[11px] font-extrabold text-amber-600 lg:text-xs">
            {formatPoints(reward.pointsCost)}
          </span>
          <span className="hidden text-xs text-on-surface-variant lg:inline">
            ·
          </span>
          <span className="hidden text-xs font-bold text-on-surface-variant lg:inline">
            {reward.pointsCurrency === "daily_checkin" ? "chuyên cần" : "điểm"}
          </span>
          {reward.pointsCurrency === "daily_checkin" && (
            <span className="text-[9px] font-bold text-primary lg:hidden">
              điểm chuyên cần
            </span>
          )}
        </div>
        {!canAfford && !isSoldOut && (
          <p className="text-center text-[9px] font-semibold text-rose-500">
            Còn thiếu {formatPoints(shortage)}
          </p>
        )}
        {isSoldOut && (
          <p className="text-center text-[9px] font-semibold text-rose-500">
            Đã hết lượt đổi
          </p>
        )}
        <button
          onClick={() => onRedeem(reward)}
          disabled={disabled}
          className={`w-full rounded-xl py-2 text-[9px] font-black uppercase tracking-widest transition-all active:scale-90 lg:w-full lg:px-2 lg:py-2.5 lg:text-xs ${
            disabled
              ? "cursor-not-allowed bg-surface-container text-on-surface-variant/50"
              : "primary-gradient text-white"
          }`}
        >
          {isSoldOut ? "Hết lượt" : canAfford ? "Đổi ngay" : "Thiếu điểm"}
        </button>
      </div>
    </div>
  );
}
