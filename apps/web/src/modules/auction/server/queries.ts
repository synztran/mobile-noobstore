import "server-only";

import { getAdminClient } from "@/lib/supabase/admin";
import { getPublicClient } from "@/lib/supabase/public";
import type {
  AuctionBidItem,
  AuctionEligibility,
  AuctionProductItem,
  AuctionStatus,
  UserBidHistoryItem,
} from "../types";

export function maskBidderName(nameOrEmail?: string | null): string {
  if (!nameOrEmail) return "Người ẩn danh";
  const trimmed = nameOrEmail.trim();
  if (trimmed.includes("@")) {
    const [name] = trimmed.split("@");
    const maskedName =
      name.length <= 2 ? `${name[0]}***` : `${name[0]}***${name[name.length - 1]}`;
    return `${maskedName}@***`;
  }
  const parts = trimmed.split(/\s+/);
  return parts
    .map((p) => (p.length <= 1 ? p : `${p[0]}***`))
    .join(" ");
}

export function calculateMinNextBid(
  currentPrice: number,
  startingPrice: number,
  hasBids: boolean,
  incrementType: "fixed" | "percentage",
  incrementValue: number
): number {
  if (!hasBids) {
    return startingPrice;
  }
  if (incrementType === "percentage") {
    const inc = Math.max(1000, Math.round((currentPrice * incrementValue) / 100));
    return currentPrice + inc;
  }
  return currentPrice + incrementValue;
}

export async function getAuctionList(options?: {
  status?: AuctionStatus;
  isFeatured?: boolean;
  limit?: number;
}): Promise<AuctionProductItem[]> {
  const supabase = getAdminClient();
  let query = (supabase as any)
    .from("auction_products")
    .select(`
      id, product_id, starting_price, bin_price, increment_type, increment_value,
      current_price, current_winner_id, status, is_featured, required_customer_level,
      required_order_count, limit_bids_per_user, max_bids_per_user, starts_at, ends_at,
      anti_snipe_minutes, winner_checkout_hours, max_winner_cascades, winner_deadline,
       order_id, created_at, updated_at, product_details,
      product:products (
        id, name, slug, thumbnail, base_price, brand, description, images, attributes,
        variants:product_variants (
          id, variant_name, attributes, stock_quantity, thumbnail
        )
      )
    `);

  if (options?.status) {
    query = query.eq("status", options.status);
  } else {
    // By default, list active first, then ended (exclude draft)
    query = query.neq("status", "draft");
  }

  if (options?.isFeatured !== undefined) {
    query = query.eq("is_featured", options.isFeatured);
  }

  query = query
    .order("status", { ascending: true }) // 'active' comes before 'ended' alphabetically
    .order("ends_at", { ascending: true });

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data: rows, error } = await query;
  if (error || !rows) {
    return [];
  }

  // Fetch bid stats for each auction
  const auctionIds = rows.map((r: any) => r.id);
  const bidStatsMap = new Map<string, { total_bids: number; unique_bidders: number }>();

  if (auctionIds.length > 0) {
    const { data: bids } = await (supabase as any)
      .from("auction_bids")
      .select("auction_id, user_id")
      .in("auction_id", auctionIds);

    if (bids) {
      const grouped = new Map<string, Set<string>>();
      const counts = new Map<string, number>();

      for (const b of bids) {
        counts.set(b.auction_id, (counts.get(b.auction_id) ?? 0) + 1);
        if (!grouped.has(b.auction_id)) {
          grouped.set(b.auction_id, new Set());
        }
        grouped.get(b.auction_id)!.add(b.user_id);
      }

      for (const id of auctionIds) {
        bidStatsMap.set(id, {
          total_bids: counts.get(id) ?? 0,
          unique_bidders: grouped.get(id)?.size ?? 0,
        });
      }
    }
  }

  return rows.map((r: any) => {
    const stats = bidStatsMap.get(r.id) ?? { total_bids: 0, unique_bidders: 0 };
    return {
      ...r,
      starting_price: Number(r.starting_price),
      bin_price: r.bin_price ? Number(r.bin_price) : null,
      increment_value: Number(r.increment_value),
      current_price: Number(r.current_price),
      total_bids: stats.total_bids,
      unique_bidders: stats.unique_bidders,
    } as AuctionProductItem;
  });
}

export async function getAuctionById(
  idOrSlug: string,
  currentUserId?: string | null
): Promise<{
  auction: AuctionProductItem | null;
  bids: AuctionBidItem[];
  eligibility: AuctionEligibility;
}> {
  const supabase = getAdminClient();
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);

  const selectFields = `
    id, product_id, starting_price, bin_price, increment_type, increment_value,
    current_price, current_winner_id, status, is_featured, required_customer_level,
    required_order_count, limit_bids_per_user, max_bids_per_user, starts_at, ends_at,
    anti_snipe_minutes, winner_checkout_hours, max_winner_cascades, winner_deadline,
     order_id, created_at, updated_at, product_details,
    product:products (
      id, name, slug, thumbnail, base_price, brand, description, images, attributes,
      variants:product_variants (
        id, variant_name, attributes, stock_quantity, thumbnail
      )
    )
  `;

  let row: any = null;

  if (isUUID) {
    const { data } = await (supabase as any)
      .from("auction_products")
      .select(selectFields)
      .eq("id", idOrSlug)
      .maybeSingle();
    row = data;
  }

  // If not found by UUID or if idOrSlug is a product slug
  if (!row) {
    const { data: prod } = await (supabase as any)
      .from("products")
      .select("id")
      .eq("slug", idOrSlug)
      .maybeSingle();

    if (prod?.id) {
      const { data: auctionRows } = await (supabase as any)
        .from("auction_products")
        .select(selectFields)
        .eq("product_id", prod.id)
        .order("created_at", { ascending: false })
        .limit(5);

      if (auctionRows && auctionRows.length > 0) {
        row = auctionRows.find((r: any) => r.status === "active") || auctionRows[0];
      }
    }
  }

  if (!row) {
    return {
      auction: null,
      bids: [],
      eligibility: {
        can_bid: false,
        code: "auction_not_found",
        message: "Không tìm thấy phiên đấu giá",
        user_level: 0,
        required_level: 0,
        user_orders: 0,
        required_orders: 0,
        bids_placed: 0,
        max_bids: null,
        is_winning: false,
        min_next_bid: 0,
      },
    };
  }

  const id = row.id;

  // Fetch bids for this auction (up to 50 latest)
  const { data: bidRows } = await (supabase as any)
    .from("auction_bids")
    .select(`
      id, auction_id, user_id, amount, is_winning, cascade_skip_at, created_at,
      user:users (
        id, email, first_name, last_name
      )
    `)
    .eq("auction_id", id)
    .order("amount", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(50);

  const bids: AuctionBidItem[] = (bidRows ?? []).map((b: any) => {
    const isMe = currentUserId ? b.user_id === currentUserId : false;
    const name = b.user
      ? `${b.user.first_name ?? ""} ${b.user.last_name ?? ""}`.trim() || b.user.email
      : "Người tham gia";

    return {
      id: b.id,
      auction_id: b.auction_id,
      user_id: b.user_id,
      amount: Number(b.amount),
      is_winning: Boolean(b.is_winning),
      cascade_skip_at: b.cascade_skip_at,
      created_at: b.created_at,
      bidder_display: isMe ? "Bạn" : maskBidderName(name),
      is_current_user: isMe,
    };
  });

  const totalBids = bids.length;
  const uniqueBidders = new Set(bids.map((b) => b.user_id)).size;

  const auction: AuctionProductItem = {
    ...row,
    starting_price: Number(row.starting_price),
    bin_price: row.bin_price ? Number(row.bin_price) : null,
    increment_value: Number(row.increment_value),
    current_price: Number(row.current_price),
    total_bids: totalBids,
    unique_bidders: uniqueBidders,
  };

  const minNextBid = calculateMinNextBid(
    auction.current_price,
    auction.starting_price,
    bids.length > 0,
    auction.increment_type,
    auction.increment_value
  );

  // Compute eligibility
  let userLevel = 0;
  let userOrders = 0;
  let bidsPlaced = 0;
  const isWinning = currentUserId ? auction.current_winner_id === currentUserId : false;
  let canBid = true;
  let errorCode: string | undefined;
  let errorMessage: string | undefined;

  const now = new Date();
  const startsAt = new Date(auction.starts_at);
  const endsAt = new Date(auction.ends_at);

  if (auction.status !== "active") {
    canBid = false;
    errorCode = "auction_not_active";
    errorMessage = "Phiên đấu giá chưa mở hoặc đã kết thúc";
  } else if (now < startsAt) {
    canBid = false;
    errorCode = "auction_not_started";
    errorMessage = "Phiên đấu giá chưa bắt đầu";
  } else if (now >= endsAt) {
    canBid = false;
    errorCode = "auction_ended";
    errorMessage = "Phiên đấu giá đã kết thúc";
  } else if (!currentUserId) {
    canBid = false;
    errorCode = "unauthenticated";
    errorMessage = "Vui lòng đăng nhập để tham gia đấu giá";
  } else {
    // Check user rank level
    const { data: userData } = await (supabase as any)
      .from("users")
      .select("rank_id, customer_ranks(level)")
      .eq("id", currentUserId)
      .maybeSingle();

    userLevel = userData?.customer_ranks?.level ?? 0;

    // Check completed orders
    const { count: orderCount } = await (supabase as any)
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("user_id", currentUserId)
      .not("status", "in", '("cancelled","refunded")');

    userOrders = orderCount ?? 0;

    // Check user bid count on this auction
    const userBids = bids.filter((b) => b.user_id === currentUserId);
    bidsPlaced = userBids.length;

    if (isWinning) {
      canBid = false;
      errorCode = "already_highest_bidder";
      errorMessage = "Bạn đang là người trả giá cao nhất";
    } else if (userLevel < auction.required_customer_level) {
      canBid = false;
      errorCode = "insufficient_customer_level";
      errorMessage = `Yêu cầu cấp bậc thành viên tối thiểu Level ${auction.required_customer_level}`;
    } else if (userOrders < auction.required_order_count) {
      canBid = false;
      errorCode = "insufficient_order_count";
      errorMessage = `Yêu cầu đã mua ít nhất ${auction.required_order_count} đơn hàng`;
    } else if (
      auction.limit_bids_per_user &&
      auction.max_bids_per_user &&
      bidsPlaced >= auction.max_bids_per_user
    ) {
      canBid = false;
      errorCode = "bid_limit_reached";
      errorMessage = `Bạn đã đặt tối đa ${auction.max_bids_per_user} lượt cho phiên này`;
    }
  }

  const eligibility: AuctionEligibility = {
    can_bid: canBid,
    code: errorCode,
    message: errorMessage,
    user_level: userLevel,
    required_level: auction.required_customer_level,
    user_orders: userOrders,
    required_orders: auction.required_order_count,
    bids_placed: bidsPlaced,
    max_bids: auction.limit_bids_per_user ? auction.max_bids_per_user : null,
    is_winning: isWinning,
    min_next_bid: minNextBid,
  };

  return { auction, bids, eligibility };
}

export async function getUserBidHistory(userId: string): Promise<UserBidHistoryItem[]> {
  const supabase = getAdminClient();

  const { data: bids, error } = await (supabase as any)
    .from("auction_bids")
    .select(`
      id, amount, is_winning, cascade_skip_at, created_at,
      auction:auction_products (
        id, product_id, current_price, status, ends_at, winner_deadline, order_id, current_winner_id,
        product:products (
          id, name, slug, thumbnail
        )
      )
    `)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error || !bids) {
    return [];
  }

  const now = new Date();

  return bids.map((b: any) => {
    const auc = b.auction;
    const isWinner = auc.current_winner_id === userId && auc.status === "ended";
    const deadline = auc.winner_deadline ? new Date(auc.winner_deadline) : null;
    const canCheckout = isWinner && !auc.order_id && (!deadline || deadline > now);

    return {
      bid_id: b.id,
      amount: Number(b.amount),
      created_at: b.created_at,
      is_winning: Boolean(b.is_winning),
      cascade_skip_at: b.cascade_skip_at,
      auction: {
        id: auc.id,
        product_id: auc.product_id,
        product_name: auc.product?.name ?? "Sản phẩm",
        product_slug: auc.product?.slug ?? "",
        thumbnail: auc.product?.thumbnail ?? null,
        current_price: Number(auc.current_price),
        status: auc.status,
        ends_at: auc.ends_at,
        winner_deadline: auc.winner_deadline,
        is_winner: isWinner,
        can_checkout: canCheckout,
        order_id: auc.order_id,
      },
    };
  });
}
