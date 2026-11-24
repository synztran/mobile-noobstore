import { NextResponse, type NextRequest } from "next/server";
import { getAuctionList } from "@/modules/auction/server/queries";
import type { AuctionStatus } from "@/modules/auction/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") as AuctionStatus | null;
    const featuredParam = searchParams.get("featured");
    const limitParam = searchParams.get("limit");

    const auctions = await getAuctionList({
      status: status ?? undefined,
      isFeatured: featuredParam !== null ? featuredParam === "true" : undefined,
      limit: limitParam ? parseInt(limitParam, 10) : undefined,
    });

    return NextResponse.json({ auctions });
  } catch (err) {
    console.error("[api/auctions] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
