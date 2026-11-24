import { getAdminClient } from "@/lib/supabase/admin";
import { parseAuctionProductDetails } from "@/lib/auction-product-details";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const supabase = getAdminClient();
  const sp = req.nextUrl.searchParams;
  const status = sp.get("status");

  let query = (supabase as any)
    .from("auction_products")
    .select(`
      *,
      product:products (
        id, name, slug, thumbnail, base_price, brand, description
      )
    `)
    .order("created_at", { ascending: false });

  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  const { data: rows, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Fetch bid counts per auction
  const auctionIds = (rows ?? []).map((r: any) => r.id);
  const countMap = new Map<string, number>();

  if (auctionIds.length > 0) {
    const { data: bids } = await (supabase as any)
      .from("auction_bids")
      .select("auction_id")
      .in("auction_id", auctionIds);

    for (const b of bids ?? []) {
      countMap.set(b.auction_id, (countMap.get(b.auction_id) ?? 0) + 1);
    }
  }

  const formatted = (rows ?? []).map((r: any) => ({
    ...r,
    starting_price: Number(r.starting_price),
    bin_price: r.bin_price ? Number(r.bin_price) : null,
    increment_value: Number(r.increment_value),
    current_price: Number(r.current_price),
    total_bids: countMap.get(r.id) ?? 0,
  }));

  return NextResponse.json({ auctions: formatted });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const supabase = getAdminClient();

  const {
    product_id,
    starting_price,
    bin_price,
    increment_type = "fixed",
    increment_value,
    starts_at,
    ends_at,
    anti_snipe_minutes = 5,
    winner_checkout_hours = 24,
    max_winner_cascades = 3,
    required_customer_level = 0,
    required_order_count = 0,
    limit_bids_per_user = false,
    max_bids_per_user = null,
    status = "draft",
    is_featured = false,
    product_details = null,
  } = body;

  const parsedProductDetails = product_details === null
    ? null
    : parseAuctionProductDetails(product_details);
  if (product_details !== null && !parsedProductDetails) {
    return NextResponse.json({ error: "Thông tin chi tiết sản phẩm không hợp lệ" }, { status: 400 });
  }

  if (!product_id || !starting_price || !increment_value || !starts_at || !ends_at) {
    return NextResponse.json(
      { error: "Vui lòng điền đầy đủ các thông tin bắt buộc" },
      { status: 400 }
    );
  }

  const numStartingPrice = Number(starting_price);
  const numBinPrice = bin_price ? Number(bin_price) : null;
  const numIncrementVal = Number(increment_value);

  if (numBinPrice && numBinPrice <= numStartingPrice) {
    return NextResponse.json(
      { error: "Giá mua ngay (BIN) phải lớn hơn giá khởi điểm" },
      { status: 400 }
    );
  }

  if (new Date(ends_at) <= new Date(starts_at)) {
    return NextResponse.json(
      { error: "Thời gian kết thúc phải sau thời gian bắt đầu" },
      { status: 400 }
    );
  }

  const { data, error } = await (supabase as any)
    .from("auction_products")
    .insert({
      product_id,
      starting_price: numStartingPrice,
      bin_price: numBinPrice,
      increment_type,
      increment_value: numIncrementVal,
      current_price: numStartingPrice,
      starts_at,
      ends_at,
      anti_snipe_minutes: Number(anti_snipe_minutes),
      winner_checkout_hours: Number(winner_checkout_hours),
      max_winner_cascades: Number(max_winner_cascades),
      required_customer_level: Number(required_customer_level),
      required_order_count: Number(required_order_count),
      limit_bids_per_user: Boolean(limit_bids_per_user),
      max_bids_per_user: limit_bids_per_user ? Number(max_bids_per_user) : null,
      status,
      is_featured: Boolean(is_featured),
      product_details: parsedProductDetails,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, auction: data });
}
