"use client";

import { ArrowLeft, Clock, Wallet } from "lucide-react";
import Link from "next/link";
import { formatPoints } from "./utils";

interface Props {
  isLoading?: boolean;
  balance: number;
  claimsCount: number;
  showHistory: boolean;
  onToggleHistory: () => void;
}

export function PointsBalanceCard({
  isLoading,
  balance,
  claimsCount,
  showHistory,
  onToggleHistory,
}: Props) {
  if (isLoading) {
    return (
      <div className="animate-pulse rounded-2xl bg-primary-gradient p-5 shadow-ambient-sm">
        <div className="mb-4 flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-3 w-20 rounded-full bg-white/30" />
            <div className="h-8 w-36 rounded-full bg-white/30" />
          </div>
          <div className="h-14 w-14 rounded-2xl bg-white/20" />
        </div>
        <div className="flex gap-4">
          <div className="h-3 w-24 rounded-full bg-white/30" />
          <div className="h-3 w-28 rounded-full bg-white/30" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-primary-gradient p-5 shadow-ambient-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-white/80">Số dư điểm</p>
          <p className="mt-1 text-3xl font-black text-white">
            {formatPoints(balance)}
          </p>
        </div>
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20">
          <Wallet size={28} className="text-white" />
        </div>
      </div>
      <div className="flex gap-4">
        <Link
          href="/profile/points"
          className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-white/70 transition-all hover:text-white"
        >
          Lịch sử điểm
          <ArrowLeft size={12} className="rotate-180" />
        </Link>
        <button
          onClick={onToggleHistory}
          className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-white/70 transition-all hover:text-white"
        >
          <Clock size={12} />
          {showHistory ? "Ẩn lịch sử" : `Lịch sử (${claimsCount})`}
        </button>
      </div>
    </div>
  );
}