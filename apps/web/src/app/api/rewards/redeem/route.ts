import { getAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { CACHE_KEYS, invalidateCache } from "@/lib/redis/cache";
import { redeemDailyCheckinReward } from "@/lib/points/service";
import type { RedeemResponse } from "@/types/reward";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const admin = getAdminClient() as any;
    const sb = supabase as any;

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const rewardItemId = body?.rewardItemId as string | undefined;
    if (!rewardItemId) {
      return NextResponse.json({ error: "Missing rewardItemId" }, { status: 400 });
    }

    // Fetch the reward item
    const { data: rewardRow, error: rewardError } = await admin
      .from("reward_items")
      .select("*")
      .eq("id", rewardItemId)
      .eq("is_active", true)
      .single();

    if (rewardError || !rewardRow) {
      return NextResponse.json({ error: "Reward not found or inactive" }, { status: 404 });
    }

    const row = rewardRow as Record<string, unknown>;
    if (row.points_currency === "daily_checkin") {
      const raw = row.metadata as Record<string, unknown> | null;
      const result = await redeemDailyCheckinReward(admin, user.id, rewardItemId);
      await invalidateCache(CACHE_KEYS.pointsBalance(user.id));
      return NextResponse.json({
        success: true,
        rewardType: result.rewardType,
        voucherCode: result.voucherCode,
        voucherName: result.rewardName,
        pointsSpent: result.pointsSpent,
        newBalance: result.newBalance,
        benefit: getVoucherBenefit(raw),
      });
    }

    const { data: redemption, error: redemptionError } = await admin.rpc(
      "redeem_nsp_reward",
      { p_user_id: user.id, p_reward_item_id: rewardItemId }
    );
    if (redemptionError || !redemption) {
      console.error("[rewards/redeem] atomic redemption failed", {
        userId: user.id,
        rewardItemId,
        error: redemptionError?.message,
      });
      const error = redemptionError?.message ?? "redemption_failed";
      const message = error.includes("insufficient_points")
        ? "Không đủ điểm NSP"
        : error.includes("reward_out_of_stock")
          ? "Phần thưởng đã hết"
          : error.includes("reward_unavailable")
            ? "Phần thưởng không còn khả dụng"
            : "Không thể đổi phần thưởng lúc này. Vui lòng thử lại.";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    await invalidateCache(CACHE_KEYS.pointsBalance(user.id));
    return NextResponse.json(redemption as RedeemResponse);
  } catch (err) {
    console.error("[rewards/redeem] request failed", err);
    return NextResponse.json(
      { error: "Không thể đổi phần thưởng lúc này. Vui lòng thử lại." },
      { status: 500 }
    );
  }
}

function getVoucherBenefit(meta: Record<string, unknown> | null): string {
  if (meta?.reward_type === "free_shipping") return "Miễn phí vận chuyển";
  if (meta?.reward_type === "percent_off") {
    const cap = Number(meta.max_discount_amount ?? 0);
    return `Giảm ${meta.percent_off}%${cap > 0 ? ` (tối đa ${cap.toLocaleString("vi-VN")}₫)` : ""}`;
  }
  const amount = Number(meta?.amount_off ?? 0);
  const max = Number(meta?.max_discount_amount ?? 0);
  return `Giảm ${amount.toLocaleString("vi-VN")}₫${max > 0 ? ` (tối đa ${max.toLocaleString("vi-VN")}₫)` : ""}`;
}
