import "server-only";

import { getAdminClient } from "@/lib/supabase/admin";
import type { PlaceBidResponse } from "../types";

const ERROR_MESSAGE_MAP: Record<string, string> = {
  invalid_bid_request: "Yêu cầu đặt giá không hợp lệ",
  auction_not_found: "Không tìm thấy phiên đấu giá",
  auction_not_active: "Phiên đấu giá chưa mở hoặc đã kết thúc",
  auction_not_started: "Phiên đấu giá chưa bắt đầu",
  auction_ended: "Phiên đấu giá đã kết thúc",
  user_not_found: "Tài khoản người dùng không tồn tại",
  already_highest_bidder: "Bạn đang là người trả giá cao nhất",
  insufficient_customer_level: "Cấp bậc thành viên của bạn chưa đủ điều kiện",
  insufficient_order_count: "Số đơn hàng đã mua chưa đủ điều kiện tham gia",
  bid_limit_reached: "Bạn đã đạt giới hạn số lần đặt giá cho phiên này",
  bid_too_low: "Mức giá đặt chưa đủ mức tăng tối thiểu",
  bid_increment_invalid: "Mức giá phải đúng theo bước tăng của phiên đấu giá",
};

export async function placeBidServer(
  auctionId: string,
  userId: string,
  amount: number
): Promise<PlaceBidResponse> {
  const supabase = getAdminClient();

  // Find previous winner before placing bid (to notify if outbid)
  const { data: currentAuction } = await (supabase as any)
    .from("auction_products")
    .select("current_winner_id, product:products(name)")
    .eq("id", auctionId)
    .maybeSingle();

  const prevWinnerId = currentAuction?.current_winner_id;
  const productName = currentAuction?.product?.name ?? "Sản phẩm đấu giá";

  // Call atomic RPC
  const { data: rpcResult, error: rpcError } = await (supabase as any).rpc(
    "place_auction_bid",
    {
      p_auction_id: auctionId,
      p_user_id: userId,
      p_amount: amount,
    }
  );

  if (rpcError) {
    const rawCode = rpcError.message || "unknown_error";
    // Extract code if format is "P0001: code"
    const matched = rawCode.match(/(?:ERROR:\s*)?([a-z_]+)/i);
    const code = matched ? matched[1].toLowerCase() : rawCode;
    const errorMsg = ERROR_MESSAGE_MAP[code] || "Không thể đặt giá, vui lòng thử lại";

    return {
      success: false,
      code,
      error: errorMsg,
    };
  }

  // If there was a previous winner and it's a different user, notify them
  if (prevWinnerId && prevWinnerId !== userId) {
    try {
      await (supabase as any).from("user_notifications").insert({
        user_id: prevWinnerId,
        title: "Bạn vừa bị vượt giá đấu!",
        body: `Một thành viên khác vừa đặt giá cao hơn cho "${productName}". Hãy vào kiểm tra ngay!`,
        type: "auction_outbid",
        deep_link: `/auctions/${auctionId}`,
        metadata: { auction_id: auctionId, outbid_at: new Date().toISOString() },
      });
    } catch (e) {
      // Best-effort notification, do not fail bid response
      console.error("[auction/place-bid] Failed to notify previous winner:", e);
    }
  }

  return {
    success: true,
    bid_id: rpcResult?.bid_id,
    amount: rpcResult?.amount,
    ends_at: rpcResult?.ends_at,
    is_extended: rpcResult?.is_extended,
    status: rpcResult?.status,
  };
}
