import Link from "next/link";
import { ArrowRight, Gavel, Sparkles } from "lucide-react";
import { getCachedAuctionList } from "@/modules/auction/server/ssr";
import { AuctionCard } from "@/modules/auction/ui/AuctionCard";

export async function FeaturedAuctionsSection() {
  const auctions = await getCachedAuctionList({
    status: "active",
    isFeatured: true,
    limit: 4,
  });

  if (!auctions || auctions.length === 0) {
    return null;
  }

  return (
    <section className="space-y-4 pt-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-primary/20 text-primary flex items-center justify-center">
            <Gavel size={18} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-lg md:text-xl font-extrabold text-foreground tracking-tight">
                Đấu Giá Nổi Bật
              </h2>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-500 flex items-center gap-0.5">
                <Sparkles size={10} />
                Hot
              </span>
            </div>
            <p className="text-xs text-muted-foreground hidden sm:block">
              Săn ngay bàn phím cơ & gear độc bản với giá do bạn quyết định
            </p>
          </div>
        </div>

        <Link
          href="/auctions"
          className="group inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
        >
          <span>Xem tất cả</span>
          <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {auctions.map((auc) => (
          <AuctionCard key={auc.id} auction={auc} />
        ))}
      </div>
    </section>
  );
}
