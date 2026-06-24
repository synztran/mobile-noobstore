import { getAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { spendPoints, earnPointsFixed } from "@/lib/points/service";
import type { RedeemResponse } from "@/types/reward";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function genVoucherCode(): string {
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `RE-${rand}`;
}

function buildVoucherBenefit(meta: Record<string, unknown>): string {
  const amountOff = meta.amount_off as number | null;
  const percentOff = meta.percent_off as number | null;
  const maxDiscount = meta.max_discount_amount as number | null;
  const discMax = maxDiscount ? ` (tối đa ${maxDiscount.toLocaleString("vi-VN")}₫)` : "";
  const rewardType = meta.reward_type as string;
  if (rewardType === "amount_off") return `Giảm ${amountOff?.toLocaleString("vi-VN")}₫${discMax}`;
  if (rewardType === "percent_off") return `Giảm ${percentOff}%${discMax}`;
  if (rewardType === "free_shipping") return "Miễn phí vận chuyển";
  return "";
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const sb = supabase as any;
    const admin = getAdminClient() as any;

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
    const { data: rewardRow, error: rewardError } = await sb
      .from("reward_items")
      .select("*")
      .eq("id", rewardItemId)
      .eq("is_active", true)
      .single();

    if (rewardError || !rewardRow) {
      return NextResponse.json({ error: "Reward not found or inactive" }, { status: 404 });
    }

    const row = rewardRow as Record<string, unknown>;
    const rewardType = row.reward_type as string;
    const pointsCost = row.points_cost as number;
    const meta = (row.metadata as Record<string, unknown>) ?? {};
    const stock = row.stock as number | null;

    // Check stock
    if (stock !== null && (row.claimed_count as number) >= stock) {
      return NextResponse.json({ error: "Phần thưởng đã hết" }, { status: 400 });
    }

    // Check balance
    const { data: userData } = await sb
      .from("users")
      .select("points_balance")
      .eq("id", user.id)
      .single();
    const currentBalance = (userData as { points_balance: number } | null)?.points_balance ?? 0;
    if (currentBalance < pointsCost) {
      return NextResponse.json({ error: "Không đủ điểm NSP" }, { status: 400 });
    }

    // Spend points
    const result = await spendPoints(
      supabase,
      user.id,
      pointsCost,
      "voucher_exchange",
      rewardItemId,
      `Đổi "${row.name as string}"`
    );

    // Build response based on reward type
    let response: RedeemResponse;

    if (rewardType === "voucher") {
      const code = genVoucherCode();
      const benefit = buildVoucherBenefit(meta);

      // Create a user-specific voucher row (use admin client to bypass RLS)
      const { data: newVoucher, error: insertError } = await admin
        .from("vouchers")
        .insert({
          code,
          name: row.name as string,
          description: (row.description as string) ?? null,
          status: "active",
          reward_type: (meta.reward_type as string) ?? "amount_off",
          scope_type: (meta.scope_type as string) ?? "order_total",
          amount_off: (meta.amount_off as number | null) ?? null,
          percent_off: (meta.percent_off as number | null) ?? null,
          max_discount_amount: (meta.max_discount_amount as number | null) ?? null,
          min_order_amount: (meta.min_order_amount as number) ?? 0,
          stackable: false,
          user_id: user.id,
          start_at: new Date().toISOString(),
          end_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days
          metadata: {},
        })
        .select("id")
        .single();

      if (insertError || !newVoucher) {
        return NextResponse.json({ error: "Failed to create voucher" }, { status: 500 });
      }

      // Record claim
      await sb.from("reward_claims").insert({
        user_id: user.id,
        reward_item_id: rewardItemId,
        reward_type: "voucher",
        points_spent: pointsCost,
        voucher_id: (newVoucher as Record<string, unknown>).id as string,
        metadata: { voucher_code: code },
      });

      // Increment claimed_count (admin client to bypass RLS)
      await admin.from("reward_items").update({ claimed_count: (row.claimed_count as number) + 1 }).eq("id", rewardItemId);

      response = {
        success: true,
        rewardType: "voucher",
        voucherCode: code,
        voucherName: row.name as string,
        pointsSpent: pointsCost,
        newBalance: result.newBalance,
        benefit,
      };
    } else if (rewardType === "point") {
      const pointAmount = (meta.point_amount as number) ?? 0;

      // Credit points back to user (exchange bonus)
      const earnResult = await earnPointsFixed(
        supabase,
        user.id,
        "voucher_exchange",
        pointAmount,
        rewardItemId,
        `Đổi điểm: +${pointAmount} NSP từ "${row.name as string}"`
      );

      await sb.from("reward_claims").insert({
        user_id: user.id,
        reward_item_id: rewardItemId,
        reward_type: "point",
        points_spent: pointsCost,
        point_amount: pointAmount,
        metadata: {},
      });

      response = {
        success: true,
        rewardType: "point",
        pointAmount,
        pointsSpent: pointsCost,
        newBalance: earnResult.newBalance,
        benefit: `Nhận ${pointAmount} điểm NSP`,
      };
    } else {
      // product — record claim, fulfillment handled by admin
      await sb.from("reward_claims").insert({
        user_id: user.id,
        reward_item_id: rewardItemId,
        reward_type: "product",
        points_spent: pointsCost,
        product_ref: (meta.product_id as string) ?? null,
        metadata: meta,
      });

      response = {
        success: true,
        rewardType: "product",
        productRef: (meta.product_id as string) ?? null,
        pointsSpent: pointsCost,
        newBalance: result.newBalance,
        benefit: `Đã đổi "${row.name as string}"`,
      };
    }

    return NextResponse.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
