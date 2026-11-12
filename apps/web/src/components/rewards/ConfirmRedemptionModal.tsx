"use client";

import type { RewardItem } from "@/types/reward";
import { X } from "lucide-react";
import { formatPoints, getRewardIcon } from "./utils";

interface Props {
  reward: RewardItem | null;
  isPending: boolean;
  balance: number;
  onClose: () => void;
  onConfirm: (id: string) => void;
}

export function ConfirmRedemptionModal({
  reward,
  isPending,
  balance,
  onClose,
  onConfirm,
}: Props) {
  if (!reward) return null;

  return (
    <dialog
      onCancel={(e) => {
        e.preventDefault();
        if (!isPending) onClose();
      }}
      aria-labelledby="confirm-redemption-title"
      className={`modal modal-bottom sm:modal-middle ${reward ? "modal-open" : ""}`}
    >
      <div className="modal-box w-full max-w-[420px] rounded-2xl bg-surface-container-lowest p-5 shadow-ambient-lg sm:p-[22px]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-widest text-primary">
              Xác nhận đổi quà
            </p>
            <h2
              id="confirm-redemption-title"
              className="mt-1 text-lg font-extrabold text-on-surface"
            >
              Đổi voucher này?
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            aria-label="Đóng xác nhận"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-container text-on-surface-variant hover:bg-surface-container-high focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-4 flex items-center gap-3 rounded-xl border border-surface-container-high bg-surface-container-low p-3">
          <div className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-lg bg-primary-fixed/40 text-primary">
            {getRewardIcon(reward.rewardType, reward.metadata)}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-extrabold text-on-surface">
              {reward.name}
            </p>
            {reward.description && (
              <p className="mt-0.5 text-xs text-on-surface-variant">
                {reward.description}
              </p>
            )}
          </div>
        </div>

        <div className="mt-3 rounded-xl bg-surface-container-low p-3">
          {reward.pointsCurrency !== "daily_checkin" && (
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="text-on-surface-variant">Số dư hiện tại</span>
              <span className="font-bold text-on-surface">
                {formatPoints(balance).replace(/ điểm$/, "")} NSP
              </span>
            </div>
          )}
          <div className="mt-2 flex items-center justify-between gap-3 text-xs">
            <span className="text-on-surface-variant">Điểm cần đổi</span>
            <span className="font-bold text-primary">
              −{formatPoints(reward.pointsCost).replace(/ điểm$/, "")}{" "}
              {reward.pointsCurrency === "daily_checkin" ? "chuyên cần" : "NSP"}
            </span>
          </div>
          {reward.pointsCurrency !== "daily_checkin" && (
            <>
              <div className="my-2 h-px bg-surface-container-high" />
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="font-bold text-on-surface">
                  Số dư sau khi đổi
                </span>
                <span className="font-extrabold text-on-surface">
                  {formatPoints(
                    Math.max(0, balance - reward.pointsCost)
                  ).replace(/ điểm$/, "")}{" "}
                  NSP
                </span>
              </div>
            </>
          )}
        </div>
        <p className="mt-3 text-xs leading-relaxed text-on-surface-variant">
          Sau khi xác nhận, phần thưởng sẽ xuất hiện trong lịch sử đổi thưởng.
        </p>

        <div className="mt-4 flex gap-3">
          <button
            onClick={onClose}
            disabled={isPending}
            className="flex-1 rounded-full bg-surface-container py-3 text-xs font-black uppercase tracking-widest text-on-surface transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Hủy
          </button>
          <button
            onClick={() => onConfirm(reward.id)}
            disabled={isPending}
            className="primary-gradient flex-1 rounded-full py-3 text-xs font-black uppercase tracking-widest text-white transition-transform active:scale-95 disabled:opacity-60"
          >
            {isPending ? (
              <span className="loading loading-spinner loading-xs" />
            ) : (
              `Xác nhận đổi · ${formatPoints(reward.pointsCost)}`
            )}
          </button>
        </div>
      </div>
      <div className="modal-backdrop" />
    </dialog>
  );
}
