"use client";

import type { RewardItem } from "@/types/reward";
import { buildBenefit, formatPoints, getRewardIcon } from "./utils";

interface Props {
  reward: RewardItem | null;
  isPending: boolean;
  onClose: () => void;
  onConfirm: (id: string) => void;
}

export function ConfirmRedemptionModal({
  reward,
  isPending,
  onClose,
  onConfirm,
}: Props) {
  if (!reward) return null;

  return (
    <dialog
      onCancel={(e) => e.preventDefault()}
      className={`modal modal-bottom sm:modal-middle ${reward ? "modal-open" : ""}`}
    >
      <div className="modal-box rounded-2xl bg-surface px-6 pt-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-fixed/20 text-primary">
            {getRewardIcon(reward.rewardType, reward.metadata)}
          </div>
          <div>
            <p className="text-base font-black text-on-surface">
              {reward.name}
            </p>
            {reward.description && (
              <p className="mt-0.5 text-xs text-on-surface-variant">
                {reward.description}
              </p>
            )}
          </div>
        </div>

        <div className="mb-4 space-y-2">
          <div className="flex items-center justify-between rounded-xl bg-surface-container px-4 py-3">
            <span className="text-xs font-bold text-on-surface-variant">
              Giá trị
            </span>
            <span className="text-xs font-extrabold text-secondary">
              {buildBenefit(reward).benefit}
            </span>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-surface-container px-4 py-3">
            <span className="text-xs font-bold text-on-surface-variant">
              Điều kiện
            </span>
            <span className="text-xs font-extrabold text-secondary">
              {buildBenefit(reward).condition}
            </span>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-surface-container px-4 py-3">
            <span className="text-xs font-bold text-on-surface-variant">
              Điểm cần
            </span>
            <span className="text-sm font-extrabold text-amber-600">
              {formatPoints(reward.pointsCost)}
            </span>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl bg-surface-container py-3 text-[10px] font-black uppercase tracking-widest text-on-surface transition-transform active:scale-95"
          >
            Hủy
          </button>
          <button
            onClick={() => onConfirm(reward.id)}
            disabled={isPending}
            className="primary-gradient flex-1 rounded-xl py-3 text-[10px] font-black uppercase tracking-widest text-white transition-transform active:scale-95 disabled:opacity-60"
          >
            {isPending ? (
              <span className="loading loading-spinner loading-xs" />
            ) : (
              "Xác nhận đổi"
            )}
          </button>
        </div>
      </div>
      <div className="modal-backdrop" />
    </dialog>
  );
}
