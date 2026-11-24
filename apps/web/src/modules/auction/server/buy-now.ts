import "server-only";

import { getAdminClient } from "@/lib/supabase/admin";
import type { BuyNowResponse } from "../types";

const BUY_NOW_ERROR_MAP: Record<string, string> = {
  invalid_buy_now_request: "Yêu cầu mua ngay không hợp lệ",
  auction_not_found: "Không tìm thấy phiên đấu giá",
  auction_not_active: "Phiên đấu giá chưa mở hoặc đã kết thúc",
  bin_not_available: "Sản phẩm này không hỗ trợ mua ngay",
  auction_not_started: "Phiên đấu giá chưa bắt đầu",
  auction_ended: "Phiên đấu giá đã kết thúc",
  user_not_found: "Tài khoản người dùng không tồn tại",
  insufficient_customer_level: "Cấp bậc thành viên chưa đủ điều kiện mua ngay",
  insufficient_order_count: "Số đơn hàng đã mua chưa đủ điều kiện tham gia",
};

export async function buyNowServer(
  auctionId: string,
  userId: string
): Promise<BuyNowResponse> {
  const supabase = getAdminClient();

  const { data: currentAuction } = await (supabase as any)
    .from("auction_products")
    .select("product:products(name)")
    .eq("id", auctionId)
    .maybeSingle();

  const productName = currentAuction?.product?.name ?? "Sản phẩm đấu giá";

  const { data: rpcResult, error: rpcError } = await (supabase as any).rpc(
    "buy_now_auction",
    {
      p_auction_id: auctionId,
      p_user_id: userId,
    }
  );

  if (rpcError) {
    const rawCode = rpcError.message || "unknown_error";
    const matched = rawCode.match(/(?:ERROR:\s*)?([a-z_]+)/i);
    const code = matched ? matched[1].toLowerCase() : rawCode;
    const errorMsg = BUY_NOW_ERROR_MAP[code] || "Không thể thực hiện mua ngay";

    return {
      success: false,
      code,
      error: errorMsg,
    };
  }

  // Notify winner
  try {
    await (supabase as any).from("user_notifications").insert({
      user_id: userId,
      title: "Chúc mừng! Bạn đã mua ngay thành công!",
      body: `Bạn đã mua ngay thành công "${productName}". Hãy tiến hành thanh toán trong thời hạn quy định.`,
      type: "auction_won",
      deep_link: `/auctions/${auctionId}`,
      metadata: { auction_id: auctionId, buy_now: true },
    });
  } catch (e) {
    console.error("[auction/buy-now] Failed to notify winner:", e);
  }

  return {
    success: true,
    bid_id: rpcResult?.bid_id,
    amount: rpcResult?.amount,
    winner_deadline: rpcResult?.winner_deadline,
    status: rpcResult?.status,
  };
}
