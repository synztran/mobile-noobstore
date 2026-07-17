import { getAllRanks } from "@/lib/rank-server";
import { getAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const CRON_SECRET = process.env.CRON_SECRET;

export async function POST(req: Request) {
  // Verify cron secret
  const authHeader = req.headers.get("authorization");
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = getAdminClient();

    // Fetch all active ranks
    const ranks = await getAllRanks();
    if (ranks.length === 0) {
      return NextResponse.json({ error: "No active ranks found" }, { status: 400 });
    }

    // Fetch all users
    const { data: users, error: usersError } = await supabase
      .from("users")
      .select("id, rank_id");

    if (usersError || !users) {
      return NextResponse.json({ error: usersError?.message ?? "Failed to fetch users" }, { status: 500 });
    }

    const results = { processed: 0, upgraded: 0, errors: 0 };

    for (const user of users) {
      try {
        // Fetch user's order stats
        const { data: orders } = await supabase
          .from("orders")
          .select("total_price")
          .eq("user_id", user.id)
          .eq("status", "delivered");

        const totalSpent = (orders ?? []).reduce((s, o) => s + Number(o.total_price), 0);
        const orderCount = (orders ?? []).length;

        // Find highest qualifying rank
        let newRankId = ranks[0].id;
        for (const rank of ranks) {
          if (totalSpent >= rank.minTotalSpent && orderCount >= rank.minOrderCount) {
            newRankId = rank.id;
          } else {
            break;
          }
        }

        if (user.rank_id !== newRankId) {
          // Update user rank
          await supabase
            .from("users")
            .update({ rank_id: newRankId, rank_updated_at: new Date().toISOString() })
            .eq("id", user.id);

          // Record history
          await supabase.from("rank_history").insert({
            user_id: user.id,
            from_rank_id: user.rank_id,
            to_rank_id: newRankId,
            changed_by: "system",
            reason: "Daily batch rank computed",
          });

          results.upgraded++;
        }

        results.processed++;
      } catch (userErr) {
        results.errors++;
        console.error(`[compute-ranks] Failed for user ${user.id}:`, userErr);
      }
    }

    return NextResponse.json(results);
  } catch (err) {
    console.error("[compute-ranks] Unexpected error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
