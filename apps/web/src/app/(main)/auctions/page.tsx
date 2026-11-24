import type { Metadata } from "next";
import { getCachedAuctionList } from "@/modules/auction/server/ssr";
import { AuctionListClient } from "@/modules/auction/ui/AuctionListClient";

export const metadata: Metadata = {
  title: "Đấu Giá Phím Cơ & Gear Giới Hạn | NoobStore",
  description:
    "Tham gia sàn đấu giá trực tiếp NoobStore - Cơ hội săn bàn phím cơ custom, artisan keycaps và phụ kiện độc bản với giá cực tốt.",
};

export default async function AuctionsPage() {
  const auctions = await getCachedAuctionList();

  return (
    <div className="container mx-auto px-4 py-6 md:py-8">
      <AuctionListClient initialAuctions={auctions} />
    </div>
  );
}
