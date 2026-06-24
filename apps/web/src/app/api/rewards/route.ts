import { createClient } from "@/lib/supabase/server";
import type { RewardItem, RewardsResponse } from "@/types/reward";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const offset = Math.max(0, parseInt(sp.get("offset") ?? "0", 10));
    const limit = Math.min(100, Math.max(1, parseInt(sp.get("limit") ?? "12", 10)));

    const supabase = await createClient();

    const { data: rows, error, count } = await (supabase as any)
      .from("reward_items")
      .select("*", { count: "exact" })
      .eq("is_active", true)
      .order("points_cost", { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) {
      return NextResponse.json({ error: "Failed to fetch rewards" }, { status: 500 });
    }

    const rewards: RewardItem[] = (rows ?? []).map((r: Record<string, unknown>) => ({
      id: r.id as string,
      name: r.name as string,
      description: (r.description as string) ?? null,
      rewardType: r.reward_type as "voucher" | "product" | "point",
      pointsCost: r.points_cost as number,
      imageUrl: (r.image_url as string) ?? null,
      stock: (r.stock as number) ?? null,
      claimedCount: (r.claimed_count as number) ?? 0,
      metadata: (r.metadata as Record<string, unknown>) ?? {},
    }));

    const total = count ?? rewards.length;
    const hasMore = offset + limit < total;

    const res: RewardsResponse & { error?: string } = { rewards, total, hasMore };
    return NextResponse.json(res);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}