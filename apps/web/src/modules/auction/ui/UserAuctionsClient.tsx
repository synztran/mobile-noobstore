"use client";

import Image from "next/image";
import Link from "next/link";
import { Clock, Gavel, ShoppingBag, Trophy } from "lucide-react";
import { formatVND } from "@/lib/currency";
import { useUserAuctionHistoryQuery } from "../client/queries";
import { AuctionStatusBadge } from "./AuctionStatusBadge";
import type { UserBidHistoryItem } from "../types";

export function UserAuctionsClient({
  initialHistory,
}: {
  initialHistory: UserBidHistoryItem[];
}) {
  const { data: history = initialHistory } = useUserAuctionHistoryQuery();

  if (history.length === 0) {
    return (
      <div className="py-16 text-center text-muted-foreground bg-surface-container/30 rounded-2xl border border-dashed border-border/60">
        <Gavel className="mx-auto mb-3 opacity-30" size={36} />
        <h3 className="text-base font-semibold text-foreground">
          Bạn chưa tham gia phiên đấu giá nào
        </h3>
        <p className="text-xs text-muted-foreground mt-1 mb-4">
          Khám phá các sản phẩm hot đang được đấu giá ngay hôm nay!
        </p>
        <Link
          href="/auctions"
          className="inline-flex px-5 py-2.5 rounded-xl bg-primary text-primary-content font-bold text-sm shadow-sm hover:bg-primary/90 transition-all active:scale-95"
        >
          Khám phá sàn đấu giá
        </Link>
      </div>
    );
  }

  // Deduplicate by auction id to show summary per auction
  const auctionMap = new Map<string, UserBidHistoryItem>();
  for (const item of history) {
    if (!auctionMap.has(item.auction.id)) {
      auctionMap.set(item.auction.id, item);
    }
  }
  const userAuctions = Array.from(auctionMap.values());

  return (
    <div className="space-y-4">
      {userAuctions.map((item) => {
        const auc = item.auction;
        const thumbnail = auc.thumbnail || "/images/placeholder.png";

        return (
          <div
            key={auc.id}
            className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-2xl bg-surface border border-border gap-4 shadow-sm"
          >
            {/* Left: Thumbnail & Info */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-surface-container flex-shrink-0 border border-border/40">
                <Image
                  src={thumbnail}
                  alt={auc.product_name}
                  fill
                  className="object-cover"
                />
              </div>

              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <AuctionStatusBadge status={auc.status} endsAt={auc.ends_at} />
                  {auc.is_winner && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-500">
                      <Trophy size={11} />
                      Thắng cuộc
                    </span>
                  )}
                </div>

                <Link
                  href={`/auctions/${auc.product_slug || auc.id}`}
                  className="text-sm font-bold text-foreground hover:text-primary transition-colors line-clamp-1"
                >
                  {auc.product_name}
                </Link>

                <div className="text-xs text-muted-foreground flex items-center gap-2">
                  <span>Giá cao nhất của bạn:</span>
                  <span className="font-mono font-bold text-foreground">
                    {formatVND(item.amount)}
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-border/30">
              {auc.can_checkout ? (
                <Link
                  href={`/auctions/${auc.id}/checkout`}
                  className="px-4 py-2 rounded-xl bg-primary text-primary-content font-bold text-xs flex items-center gap-1.5 shadow-sm hover:bg-primary/90 transition-all active:scale-95"
                >
                  <ShoppingBag size={14} />
                  <span>Thanh toán ngay</span>
                </Link>
              ) : auc.order_id ? (
                <span className="text-xs font-semibold text-emerald-500 px-3 py-1.5 rounded-lg bg-emerald-500/10">
                  Đã tạo đơn hàng
                </span>
              ) : (
                <Link
                  href={`/auctions/${auc.product_slug || auc.id}`}
                  className="px-4 py-2 rounded-xl bg-surface-container text-foreground font-semibold text-xs hover:bg-surface-container-high transition-colors"
                >
                  Xem chi tiết
                </Link>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
