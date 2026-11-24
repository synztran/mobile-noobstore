"use client";

import { useState } from "react";
import { Gavel, Sparkles } from "lucide-react";
import { useAuctionsQuery } from "../client/queries";
import { AuctionCard } from "./AuctionCard";
import type { AuctionProductItem, AuctionStatus } from "../types";

export function AuctionListClient({
  initialAuctions,
}: {
  initialAuctions: AuctionProductItem[];
}) {
  const [filter, setFilter] = useState<"all" | "active" | "ended">("all");
  const { data: auctions = initialAuctions, isLoading } = useAuctionsQuery({
    status: filter === "all" ? undefined : filter,
  });

  const filteredAuctions = auctions.filter((item) => {
    if (filter === "active") return item.status === "active";
    if (filter === "ended") return item.status === "ended";
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-neutral-900 via-neutral-900 to-primary/20 border border-primary/20 p-6 md:p-8 text-neutral-100">
        <div className="max-w-xl space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/20 text-primary border border-primary/30">
            <Sparkles size={13} />
            <span>Sàn đấu giá NoobStore</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            Đấu Giá Phím Cơ & Gear Giới Hạn
          </h1>
          <p className="text-sm text-neutral-400">
            Cơ hội sở hữu những mẫu bàn phím cơ, custom keycaps và phụ kiện độc bản với mức giá do chính bạn quyết định.
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-border/40 pb-3">
        <button
          type="button"
          onClick={() => setFilter("all")}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            filter === "all"
              ? "bg-primary text-primary-content shadow-sm"
              : "bg-surface-container hover:bg-surface-container-high text-muted-foreground"
          }`}
        >
          Tất cả ({auctions.length})
        </button>
        <button
          type="button"
          onClick={() => setFilter("active")}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            filter === "active"
              ? "bg-emerald-500 text-neutral-950 shadow-sm"
              : "bg-surface-container hover:bg-surface-container-high text-muted-foreground"
          }`}
        >
          Đang diễn ra ({auctions.filter((a) => a.status === "active").length})
        </button>
        <button
          type="button"
          onClick={() => setFilter("ended")}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            filter === "ended"
              ? "bg-neutral-700 text-neutral-100 shadow-sm"
              : "bg-surface-container hover:bg-surface-container-high text-muted-foreground"
          }`}
        >
          Đã kết thúc ({auctions.filter((a) => a.status === "ended").length})
        </button>
      </div>

      {/* Grid */}
      {filteredAuctions.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground bg-surface-container/30 rounded-2xl border border-dashed border-border/60">
          <Gavel className="mx-auto mb-3 opacity-30" size={36} />
          <h3 className="text-base font-semibold text-foreground">
            Chưa có phiên đấu giá nào trong mục này
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Hãy quay lại sau hoặc theo dõi thông báo từ NoobStore để không bỏ lỡ các đợt đấu giá mới!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredAuctions.map((auc) => (
            <AuctionCard key={auc.id} auction={auc} />
          ))}
        </div>
      )}
    </div>
  );
}
