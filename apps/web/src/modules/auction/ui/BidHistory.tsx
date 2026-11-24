import Image from "next/image";
import { Trophy } from "lucide-react";
import { formatVND } from "@/lib/currency";
import type { AuctionBidItem } from "../types";

function formatBidTime(dateString: string): string {
  try {
    const d = new Date(dateString);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000);

    if (diffSec < 60) return "Vừa xong";
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)} phút trước`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} giờ trước`;
    return d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) + " " + d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
  } catch {
    return "";
  }
}

export function BidHistory({
  bids,
  currentPrice: _currentPrice,
}: {
  bids: AuctionBidItem[];
  currentPrice: number;
}) {
  if (bids.length === 0) {
    return (
      <div className="py-6 text-center text-muted-foreground bg-surface-container-low rounded-xl border border-dashed border-border">
        <Trophy className="mx-auto mb-1.5 opacity-30" size={24} />
        <p className="text-xs font-semibold text-foreground">Chưa có lượt đặt giá nào</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          Hãy là người đầu tiên đặt giá cho sản phẩm này!
        </p>
      </div>
    );
  }

  const displayBids = bids.slice(0, 3);

  return (
    <div className="space-y-2 border-t border-border pt-4">
      <div className="flex items-center justify-between text-xs font-semibold px-1">
        <span className="flex items-center gap-1.5 text-foreground">
          <span className="relative flex h-2 w-2" aria-hidden="true">
            <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          <span>Top 3 lượt đặt giá gần nhất</span>
        </span>
        <span className="text-muted-foreground font-mono text-[11px]">
          {bids.length} lượt đặt
        </span>
      </div>

      <div className="space-y-2">
        {displayBids.map((bid, index) => {
          const isHighest = index === 0 && bid.is_winning;
          const isSkipped = Boolean(bid.cascade_skip_at);

          return (
            <div
              key={bid.id}
              className={`flex items-center justify-between rounded-xl border p-2.5 transition-colors ${
                isHighest
                  ? "border-emerald-200 bg-emerald-50 text-foreground"
                  : isSkipped
                  ? "border-surface-border bg-surface-container opacity-40 line-through"
                  : "border-surface-border bg-white text-foreground"
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className={`h-8 w-8 shrink-0 rounded-full flex items-center justify-center p-1.5 text-[10px] ${
                    isHighest
                      ? "bg-emerald-200 text-emerald-900 font-bold"
                      : "bg-surface-container text-muted-foreground font-semibold"
                  }`}
                >
                  {isHighest ? <Image src="/icons/thiings/crown.avif" alt="Đang dẫn đầu" width={14} height={14} className="block shrink-0 object-contain" /> : index + 1}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 truncate">
                    <span
                      className={`text-xs font-bold truncate ${
                        isHighest ? "text-emerald-800" : bid.is_current_user ? "text-primary" : "text-foreground"
                      }`}
                    >
                      {bid.is_current_user ? "Bạn" : bid.bidder_display ?? "Người tham gia"}
                    </span>
                    {isHighest && (
                      <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-800">
                        Dẫn đầu
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {formatBidTime(bid.created_at)}
                  </div>
                </div>
              </div>

              <div
                className={`shrink-0 font-mono text-xs font-extrabold ${
                  isHighest ? "text-emerald-700 text-sm" : "text-foreground"
                }`}
              >
                {formatVND(bid.amount)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
