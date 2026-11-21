"use client";

import { ArrowLeft, Clock, Ticket } from "lucide-react";
import Link from "next/link";
import { formatPoints } from "./utils";

interface Props {
  isLoading?: boolean;
  balance: number;
  dailyCheckinBalance?: number;
  dailyCheckinEarliestExpiry?: string | null;
  claimsCount: number;
  showHistory: boolean;
  onToggleHistory: () => void;
}

export function PointsBalanceCard({
  isLoading,
  balance,
  dailyCheckinBalance,
  dailyCheckinEarliestExpiry,
  claimsCount,
  showHistory,
  onToggleHistory,
}: Props) {
  if (isLoading) {
    return (
      <div className="animate-pulse rounded-2xl bg-primary-gradient p-5 shadow-ambient-sm">
        <div className="mb-4 flex items-center">
          <div className="space-y-2">
            <div className="h-3 w-20 rounded-full bg-white/30" />
            <div className="h-8 w-36 rounded-full bg-white/30" />
          </div>
        </div>
        <div className="flex gap-4">
          <div className="h-3 w-24 rounded-full bg-white/30" />
          <div className="h-3 w-28 rounded-full bg-white/30" />
        </div>
      </div>
    );
  }

  const expiryFormatted = dailyCheckinEarliestExpiry
    ? new Date(dailyCheckinEarliestExpiry).toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        timeZone: "Asia/Ho_Chi_Minh",
      })
    : null;

  return (
    <div className="rounded-2xl bg-primary-gradient p-5 shadow-ambient-sm lg:flex lg:items-center lg:justify-between lg:gap-6 lg:rounded-xl lg:px-5 lg:py-3">
      <div className="mb-4 flex items-center justify-between lg:mb-0">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-white/80">
            Điểm của bạn
          </p>
          <p className="mt-0.5 text-2xl font-black text-white lg:text-2xl">
            {formatPoints(balance).replace(/ điểm$/, "")}{" "}
            <span className="text-sm">NSP</span>
          </p>
          <p className="mt-1 text-xs font-semibold text-white/80">
            <span>
              {typeof dailyCheckinBalance === "number"
                ? `${formatPoints(dailyCheckinBalance)} chuyên cần${
                    expiryFormatted ? ` (hết hạn ${expiryFormatted})` : ""
                  } · `
                : "Điểm chuyên cần · "}
            </span>
            <Link className="underline underline-offset-2" href="/profile/points">
              Lịch sử điểm
            </Link>
          </p>
        </div>
      </div>
      <div className="flex gap-4 lg:hidden">
        <Link
          href="/profile/points"
          className="inline-flex items-center gap-1 text-xs font-black uppercase tracking-widest text-white/70 transition-all hover:text-white"
        >
          Lịch sử điểm
          <ArrowLeft size={12} className="rotate-180" />
        </Link>
        <button
          onClick={onToggleHistory}
          className="inline-flex items-center gap-1 text-xs font-black uppercase tracking-widest text-white/70 transition-all hover:text-white"
        >
          <Clock size={12} />
          {showHistory ? "Ẩn lịch sử" : `Lịch sử (${claimsCount})`}
        </button>
      </div>
      <Link
        href="/rewards/gift-card"
          className="hidden shrink-0 items-center gap-2 rounded-md bg-white px-4 py-2.5 text-xs font-extrabold text-primary transition-transform active:scale-95 lg:inline-flex"
      >
        <Ticket size={16} /> Nạp thẻ quà tặng
      </Link>
    </div>
  );
}
