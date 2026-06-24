"use client";

import { Wallet } from "lucide-react";
import type { RewardItem } from "@/types/reward";
import { formatPoints, getRewardIcon } from "./utils";

interface Props {
  reward: RewardItem;
  onRedeem: (r: RewardItem) => void;
  balance: number;
}

export function RewardCard({ reward, onRedeem, balance }: Props) {
  const canAfford = balance >= reward.pointsCost;
  const isSoldOut =
    reward.stock !== null && reward.claimedCount >= reward.stock;
  const disabled = !canAfford || isSoldOut;
  const shortage = reward.pointsCost - balance;

  return (
    <div className="flex flex-col gap-2 rounded-2xl bg-surface-container-lowest p-3 shadow-ambient-sm transition-all active:scale-[0.98]">
      <div className="flex h-10 w-10 items-center justify-center self-center rounded-xl bg-primary-fixed/20 text-primary">
        {getRewardIcon(reward.rewardType, reward.metadata)}
      </div>

      <div className="text-center">
        <p className="truncate text-xs font-black text-on-surface">
          {reward.name}
        </p>
        <div className="mt-1 inline-block rounded-full bg-secondary-fixed/30 px-2 py-0.5 text-[8px] font-black uppercase tracking-widest text-secondary">
          {reward.rewardType === "point"
            ? "ĐIỂM"
            : reward.rewardType === "product"
              ? "QUÀ"
              : "VOUCHER"}
        </div>
      </div>

      {reward.description && (
        <p className="line-clamp-2 text-[10px] leading-relaxed text-on-surface-variant">
          {reward.description}
        </p>
      )}

      <div className="mt-auto flex flex-col gap-1.5">
        <div className="flex items-center justify-center gap-1">
          <Wallet size={11} className="text-amber-500" />
          <span className="text-[11px] font-extrabold text-amber-600">
            {formatPoints(reward.pointsCost)}
          </span>
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
          className={`w-full rounded-xl py-2 text-[9px] font-black uppercase tracking-widest transition-all active:scale-90 ${
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