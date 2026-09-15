"use client";

import type { CustomerRank, RankProgress } from "@/types/rank";
import { formatVND } from "@/lib/currency";
import { ChevronRight, Info } from "lucide-react";
import { RankBadge } from "./RankBadge";

interface Props {
  currentRank: CustomerRank;
  nextRank: CustomerRank | null;
  progress: RankProgress;
  onBadgeClick: () => void;
}

export function RankProgressCardSkeleton() {
  return (
    <div className="mb-2 animate-pulse rounded-2xl bg-surface-container-high p-4 shadow-ambient-sm">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-10 w-10 rounded-full bg-surface-container" />
          <div className="space-y-1.5">
            <div className="h-2 w-16 rounded-full bg-surface-container" />
            <div className="h-3 w-20 rounded-full bg-surface-container-high" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="space-y-1.5 text-right">
            <div className="ml-auto h-2 w-12 rounded-full bg-surface-container" />
            <div className="ml-auto h-3 w-16 rounded-full bg-surface-container-high" />
          </div>
          <div className="h-10 w-10 rounded-full bg-surface-container" />
        </div>
      </div>
      <div className="space-y-3">
        <div className="space-y-1.5">
          <div className="h-2 w-24 rounded-full bg-surface-container" />
          <div className="h-2 w-full rounded-full bg-surface-container-high" />
        </div>
        <div className="space-y-1.5">
          <div className="h-2 w-20 rounded-full bg-surface-container" />
          <div className="h-2 w-full rounded-full bg-surface-container-high" />
        </div>
        <div className="mx-auto h-2 w-48 rounded-full bg-surface-container" />
      </div>
      <div className="mt-3 h-9 w-full rounded-xl bg-surface-container-lowest" />
    </div>
  );
}

export function RankProgressCard({
  currentRank,
  nextRank,
  progress,
  onBadgeClick,
}: Props) {
  const spentPct =
    nextRank && nextRank.minTotalSpent > 0
      ? Math.min(
          100,
          Math.round((progress.totalSpent / nextRank.minTotalSpent) * 100)
        )
      : 100;

  const orderPct =
    nextRank && nextRank.minOrderCount > 0
      ? Math.min(
          100,
          Math.round((progress.orderCount / nextRank.minOrderCount) * 100)
        )
      : 100;

  const remainingSpent = nextRank
    ? Math.max(0, nextRank.minTotalSpent - progress.totalSpent)
    : 0;
  const remainingOrders = nextRank
    ? Math.max(0, nextRank.minOrderCount - progress.orderCount)
    : 0;

  return (
    <div className="mb-2 rounded-2xl bg-surface-container-high p-4 shadow-ambient-sm">
      {/* Header: current → next */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <RankBadge rank={currentRank} size="md" onClick={onBadgeClick} />
          <div>
            <p className="text-xs font-bold text-on-surface-variant">
              Bậc hiện tại
            </p>
            <p className="text-sm font-black text-on-surface">
              {currentRank.name}
            </p>
          </div>
        </div>

        {nextRank ? (
          <div className="flex items-center gap-2">
            <div className="text-right">
              <p className="text-xs font-bold text-on-surface-variant">
                Mục tiêu
              </p>
              <p className="text-sm font-black text-on-surface">
                {nextRank.name}
              </p>
            </div>
            <RankBadge rank={nextRank} size="md" />
          </div>
        ) : (
          <div className="rounded-xl bg-amber-100 px-3 py-1">
            <p className="text-[10px] font-black text-amber-700">
              Rank cao nhất
            </p>
          </div>
        )}
      </div>

      {nextRank && (
        <div className="space-y-2">
          {/* Total spent progress */}
          <div>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="font-bold text-on-surface-variant">
                Tổng chi tiêu
              </span>
              <span className="font-bold text-on-surface">
                {formatVND(progress.totalSpent)}
                <span className="text-on-surface-variant">
                  {" / "}
                  {formatVND(nextRank.minTotalSpent)}
                </span>
              </span>
            </div>
            <progress
              className="progress progress-primary h-2 w-full"
              value={spentPct}
              max="100"
            />
          </div>

          {/* Order count progress */}
          <div>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="font-bold text-on-surface-variant">
                Số đơn hàng
              </span>
              <span className="font-bold text-on-surface">
                {progress.orderCount}
                <span className="text-on-surface-variant">
                  {" / "}
                  {nextRank.minOrderCount}
                </span>
              </span>
            </div>
            <progress
              className="progress progress-primary h-2 w-full"
              value={orderPct}
              max="100"
            />
          </div>

          {/* Summary */}
          <p className="text-center text-xs font-bold text-on-surface-variant">
            {remainingSpent > 0 && remainingOrders > 0
              ? `Còn ${formatVND(remainingSpent)} và ${remainingOrders} đơn nữa để lên ${nextRank.name}`
              : remainingSpent > 0
                ? `Còn ${formatVND(remainingSpent)} để lên ${nextRank.name}`
                : `Còn ${remainingOrders} đơn nữa để lên ${nextRank.name}`}
          </p>
        </div>
      )}

      <button
        onClick={onBadgeClick}
        className="mt-3 flex w-full items-center justify-center gap-1 rounded-xl bg-surface-container-lowest py-2.5 text-xs font-bold text-primary transition-transform active:scale-[0.98]"
      >
        <Info className="h-3.5 w-3.5" />
        Xem quyền lợi bậc {currentRank.name}
        <ChevronRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
