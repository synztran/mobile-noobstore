import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCachedAuctionById } from "@/modules/auction/server/ssr";
import { AuctionDetailClient } from "@/modules/auction/ui/AuctionDetailClient";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const data = await getCachedAuctionById(id);

  if (!data.auction || !data.auction.product) {
    return {
      title: "Phiên đấu giá | NoobStore",
    };
  }

  const p = data.auction.product;
  return {
    title: `[Đấu giá] ${p.name} | NoobStore`,
    description: p.description || "Phiên đấu giá trực tiếp tại NoobStore",
    openGraph: {
      title: `[Đấu giá] ${p.name}`,
      description: p.description || undefined,
      images: p.thumbnail ? [p.thumbnail] : undefined,
    },
  };
}

export default async function AuctionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const data = await getCachedAuctionById(id, user?.id ?? null);
  if (!data.auction) {
    notFound();
  }

  return (
    <div className="container mx-auto px-4 py-6 md:py-8">
      <AuctionDetailClient
        initialData={{
          auction: data.auction,
          bids: data.bids,
          eligibility: data.eligibility,
        }}
      />
    </div>
  );
}
