import { getAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { CACHE_KEYS, invalidateCache } from "@/lib/redis/cache";
import { spendPoints } from "@/lib/points/service";
import type { RewardClaim } from "@/types/reward";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();
    const sb = supabase as any;

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: rows, error } = await sb
      .from("reward_claims")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: "Failed to fetch claims" }, { status: 500 });
    }

    const itemIds = [...new Set((rows ?? []).map((r: Record<string, unknown>) => r.reward_item_id as string))];
    let itemsMap: Record<string, Record<string, unknown>> = {};
    if (itemIds.length > 0) {
      const { data: items } = await sb
        .from("reward_items")
        .select("id, name, description, reward_type, metadata")
        .in("id", itemIds);
      for (const it of items ?? []) itemsMap[it.id] = it;
    }

    const claims: RewardClaim[] = (rows ?? []).map((r: Record<string, unknown>) => {
      const item = itemsMap[r.reward_item_id as string] ?? null;

      let benefit = "";
      if (r.reward_type === "voucher") {
        const vMeta = r.metadata as Record<string, unknown> | null;
        benefit = `Mã: ${(vMeta?.voucher_code as string) ?? ""}`;
      } else if (r.reward_type === "point") {
        benefit = `+${r.point_amount as number} NSP`;
      } else if (r.reward_type === "product") {
        benefit = "Chờ xử lý";
      }

      return {
        id: r.id as string,
        rewardItemId: r.reward_item_id as string,
        rewardName: (item?.name as string) ?? "",
        rewardType: r.reward_type as "voucher" | "product" | "point",
        pointsSpent: r.points_spent as number,
        voucherCode: (r.metadata as Record<string, unknown> | null)?.voucher_code as string | null ?? null,
        pointAmount: (r.point_amount as number) ?? null,
        productRef: (r.product_ref as string) ?? null,
        benefit,
        createdAt: r.created_at as string,
      };
    });

    return NextResponse.json({ claims });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const sb = supabase as any;
    // spend_points is service-role only (migration 131): it is SECURITY DEFINER
    // and takes p_user_id as a parameter, so it must not run as the caller.
    const admin = getAdminClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const rewardItemId = body?.reward_id as string | undefined;
    if (!rewardItemId) {
      return NextResponse.json({ error: "Missing reward_id" }, { status: 400 });
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

    // Check stock
    const stock = row.stock as number | null;
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
      admin,
      user.id,
      pointsCost,
      "voucher_exchange",
      rewardItemId,
      `Đổi "${row.name as string}"`
    );

    await invalidateCache(CACHE_KEYS.pointsBalance(user.id));

    // Record claim
    const { data: claimRow, error: insertError } = await sb
      .from("reward_claims")
      .insert({
        user_id: user.id,
        reward_item_id: rewardItemId,
        reward_type: rewardType,
        points_spent: pointsCost,
        metadata: {},
      })
      .select("id")
      .single();

    if (insertError) {
      return NextResponse.json({ error: "Failed to create claim" }, { status: 500 });
    }

    // Increment claimed_count
    await sb.from("reward_items").update({ claimed_count: (row.claimed_count as number) + 1 }).eq("id", rewardItemId);

    return NextResponse.json({
      success: true,
      claimId: (claimRow as Record<string, unknown>).id as string,
      rewardType,
      pointsSpent: pointsCost,
      newBalance: result.newBalance,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
