import Image from "next/image";
import Link from "next/link";
import { Gavel, Sparkles, Users } from "lucide-react";
import { formatVND } from "@/lib/currency";
import { AuctionStatusBadge } from "./AuctionStatusBadge";
import { AuctionTimer } from "./AuctionTimer";
import type { AuctionProductItem } from "../types";

export function AuctionCard({
  auction,
}: {
  auction: AuctionProductItem;
}) {
  const product = auction.product;
  const thumbnail = product?.thumbnail || "/images/placeholder.png";

  return (
    <Link
      href={`/auctions/${product?.slug || auction.id}`}
      className="group flex flex-col rounded-2xl bg-surface border border-border/60 hover:border-primary/50 overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300"
    >
      {/* Image & Badges */}
      <div className="relative aspect-square w-full bg-surface-container overflow-hidden">
        <Image
          src={thumbnail}
          alt={product?.name ?? "Sản phẩm đấu giá"}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="object-cover object-center group-hover:scale-105 transition-transform duration-500"
        />

        {/* Top Badges */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none gap-2">
          <AuctionStatusBadge
            status={auction.status}
            startsAt={auction.starts_at}
            endsAt={auction.ends_at}
          />
          {auction.is_featured && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-neutral-950 shadow-sm flex items-center gap-1">
              <Sparkles size={10} />
              Hot
            </span>
          )}
        </div>

        {/* Live Timer Overlay */}
        <div className="absolute bottom-2.5 left-2.5 pointer-events-none">
          <AuctionTimer
            endsAt={auction.ends_at}
            startsAt={auction.starts_at}
            variant="badge"
          />
        </div>
      </div>

      {/* Card Info */}
      <div className="flex flex-col flex-1 p-3.5 space-y-2.5">
        {product?.brand && (
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            {product.brand}
          </span>
        )}

        <h3 className="text-sm font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors leading-snug">
          {product?.name ?? "Sản phẩm đấu giá"}
        </h3>

        {/* Pricing */}
        <div className="pt-2 mt-auto border-t border-border/40 space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Giá hiện tại:</span>
            <span className="flex items-center gap-1 font-medium">
              <Users size={12} />
              <span>{auction.total_bids ?? 0} lượt</span>
            </span>
          </div>

          <div className="flex items-baseline justify-between gap-2">
            <span className="font-mono text-base sm:text-lg font-extrabold text-primary tracking-tight">
              {formatVND(auction.current_price)}
            </span>
          </div>

          {auction.bin_price && (
            <div className="flex items-center justify-between px-2.5 py-1 rounded-lg bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700/70 text-[11px]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-950 dark:text-amber-300">
                Mua ngay (BIN)
              </span>
              <span className="font-mono font-extrabold text-amber-950 dark:text-amber-200 text-xs">
                {formatVND(auction.bin_price)}
              </span>
            </div>
          )}
        </div>

        {/* Action hint */}
        <div className="w-full py-2 rounded-xl bg-surface-container group-hover:bg-primary group-hover:text-primary-content text-foreground font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors">
          <Gavel size={14} />
          <span>{auction.status === "active" ? "Tham gia đấu giá" : "Xem chi tiết"}</span>
        </div>
      </div>
    </Link>
  );
}
