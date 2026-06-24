"use client";

import type { RewardClaim } from "@/types/reward";
import { formatDate, formatPoints } from "./utils";

interface Props {
  claims: RewardClaim[];
  isLoading: boolean;
}

export function ClaimsHistory({ claims, isLoading }: Props) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-black uppercase tracking-widest text-on-surface-variant">
        Lịch sử đổi thưởng
      </p>
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="animate-pulse flex items-center justify-between rounded-xl bg-surface-container-lowest px-4 py-3 shadow-ambient-sm"
            >
              <div className="space-y-2">
                <div className="h-3 w-32 rounded-full bg-surface-container" />
                <div className="h-2.5 w-20 rounded-full bg-surface-container" />
              </div>
              <div className="h-3 w-16 rounded-full bg-surface-container" />
            </div>
          ))}
        </div>
      ) : claims.length === 0 ? (
        <p className="py-6 text-center text-xs text-on-surface-variant">
          Chưa có giao dịch nào
        </p>
      ) : (
        <div className="space-y-2">
          {claims.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between rounded-xl bg-surface-container-lowest px-4 py-3 shadow-ambient-sm"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-on-surface">
                  {c.rewardName}
                </p>
                <p className="mt-0.5 text-[10px] text-on-surface-variant">
                  {formatDate(c.createdAt)}
                </p>
              </div>
              <div className="ml-2 flex flex-col items-end gap-0.5">
                <span className="text-xs font-black text-rose-500">
                  -{formatPoints(c.pointsSpent)}
                </span>
                {c.voucherCode && (
                  <span className="text-[9px] font-bold text-secondary">
                    {c.voucherCode}
                  </span>
                )}
                {c.pointAmount && (
                  <span className="text-[9px] font-bold text-emerald-600">
                    +{c.pointAmount} NSP
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
