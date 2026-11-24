import "server-only";

import { getAdminClient } from "@/lib/supabase/admin";

export async function resolveAuctionsServer(): Promise<{
  resolved_count: number;
  cascaded_count: number;
  details: any;
}> {
  const supabase = getAdminClient();

  // 1. Resolve auctions whose ends_at has passed
  const { data: resolveData, error: resolveError } = await (supabase as any).rpc(
    "resolve_expired_auctions"
  );

  if (resolveError) {
    console.error("[auction/resolve] resolve_expired_auctions error:", resolveError);
  }

  const resolvedList = resolveData?.auctions ?? [];

  // Notify winners & participants for newly ended auctions
  for (const item of resolvedList) {
    if (item.has_winner && item.winner_id) {
      try {
        // Fetch product name
        const { data: ap } = await (supabase as any)
          .from("auction_products")
          .select("product:products(name), winner_checkout_hours")
          .eq("id", item.auction_id)
          .maybeSingle();

        const pName = ap?.product?.name ?? "Sản phẩm đấu giá";
        const hours = ap?.winner_checkout_hours ?? 24;

        // Notify winner
        await (supabase as any).from("user_notifications").insert({
          user_id: item.winner_id,
          title: "🎉 Chúc mừng bạn đã thắng phiên đấu giá!",
          body: `Bạn đã thắng sản phẩm "${pName}". Vui lòng hoàn tất đặt hàng trong vòng ${hours} giờ.`,
          type: "auction_won",
          deep_link: `/auctions/${item.auction_id}`,
          metadata: { auction_id: item.auction_id, final_price: item.final_price },
        });

        // Notify other bidders
        const { data: otherBidders } = await (supabase as any)
          .from("auction_bids")
          .select("user_id")
          .eq("auction_id", item.auction_id)
          .neq("user_id", item.winner_id);

        if (otherBidders && otherBidders.length > 0) {
          const uniqueIds = Array.from(new Set(otherBidders.map((b: any) => b.user_id)));
          const notificationRows = uniqueIds.map((uid) => ({
            user_id: uid,
            title: "Phiên đấu giá đã kết thúc",
            body: `Phiên đấu giá "${pName}" đã kết thúc. Rất tiếc bạn chưa là người thắng cuộc lần này.`,
            type: "auction_ended_lost",
            deep_link: `/auctions/${item.auction_id}`,
            metadata: { auction_id: item.auction_id },
          }));

          await (supabase as any).from("user_notifications").insert(notificationRows);
        }
      } catch (err) {
        console.error("[auction/resolve] Failed to notify ended auction participants:", err);
      }
    }
  }

  // 2. Cascade expired winners who didn't checkout in time
  const { data: cascadeData, error: cascadeError } = await (supabase as any).rpc(
    "cascade_expired_auction_winners"
  );

  if (cascadeError) {
    console.error("[auction/resolve] cascade_expired_auction_winners error:", cascadeError);
  }

  const cascadeList = cascadeData?.cascades ?? [];

  for (const c of cascadeList) {
    if (c.action === "promoted_next_winner" && c.new_winner) {
      try {
        const { data: ap } = await (supabase as any)
          .from("auction_products")
          .select("product:products(name), winner_checkout_hours")
          .eq("id", c.auction_id)
          .maybeSingle();

        const pName = ap?.product?.name ?? "Sản phẩm đấu giá";
        const hours = ap?.winner_checkout_hours ?? 24;

        await (supabase as any).from("user_notifications").insert({
          user_id: c.new_winner,
          title: "🎉 Cơ hội thanh toán đấu giá!",
          body: `Người thắng trước đã quá hạn. Bạn là người tiếp theo sở hữu "${pName}"! Vui lòng hoàn tất đặt hàng trong vòng ${hours} giờ.`,
          type: "auction_won_cascaded",
          deep_link: `/auctions/${c.auction_id}`,
          metadata: { auction_id: c.auction_id, price: c.new_price },
        });
      } catch (err) {
        console.error("[auction/resolve] Failed to notify cascaded winner:", err);
      }
    }
  }

  return {
    resolved_count: resolveData?.resolved_count ?? 0,
    cascaded_count: cascadeData?.cascaded_count ?? 0,
    details: {
      resolved: resolvedList,
      cascaded: cascadeList,
    },
  };
}
