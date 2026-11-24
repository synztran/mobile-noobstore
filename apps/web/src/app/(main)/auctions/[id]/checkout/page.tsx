import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCachedAuctionById } from "@/modules/auction/server/ssr";
import { AuctionCheckoutClient } from "@/modules/auction/ui/AuctionCheckoutClient";

export const metadata: Metadata = {
  title: "Thanh toán phiên đấu giá | NoobStore",
};

export default async function AuctionCheckoutPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirect=/auctions/${id}/checkout`);
  }

  const detail = await getCachedAuctionById(id, user.id);
  if (!detail.auction) {
    notFound();
  }

  const auction = detail.auction;
  const isWinner = auction.current_winner_id === user.id && auction.status === "ended";
  const deadlinePassed = auction.winner_deadline
    ? new Date(auction.winner_deadline) < new Date()
    : false;

  if (!isWinner || auction.order_id || deadlinePassed) {
    redirect(`/auctions/${id}`);
  }

  // Fetch user addresses
  const { data: addresses } = await supabase
    .from("user_addresses")
    .select("id, full_name, phone_number, address, city, district, ward")
    .eq("user_id", user.id)
    .order("is_default", { ascending: false });

  return (
    <div className="container mx-auto px-4 py-6 md:py-8">
      <AuctionCheckoutClient
        detail={{
          auction: detail.auction,
          bids: detail.bids,
          eligibility: detail.eligibility,
        }}
        savedAddresses={(addresses as any[]) ?? []}
      />
    </div>
  );
}
