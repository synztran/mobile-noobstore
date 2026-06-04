import { getAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/gacha/events/[id]/reward-history/[userId]
 * Returns paginated play history for a specific user in an event.
 * Query params: limit (default 20), offset (default 0)
 */
export async function GET(
	req: NextRequest,
	{ params }: { params: Promise<{ id: string; userId: string }> }
) {
	const { id, userId } = await params;
	const supabase = getAdminClient();
	const limit = Number(req.nextUrl.searchParams.get("limit")) || 20;
	const offset = Number(req.nextUrl.searchParams.get("offset")) || 0;

	// Get total count
	const { count } = await supabase
		.from("gacha_history")
		.select("*", { count: "exact", head: true })
		.eq("event_id", id)
		.eq("user_id", userId);

	// Get paginated history
	const { data: history, error } = await supabase
		.from("gacha_history")
		.select("*")
		.eq("event_id", id)
		.eq("user_id", userId)
		.order("played_at", { ascending: false })
		.range(offset, offset + limit - 1);

	if (error) return NextResponse.json({ error: error.message }, { status: 500 });

	// Fetch reward details
	const rewardIds = [...new Set((history ?? []).map((h) => h.reward_id))];
	let rewardsMap: Record<number, { name: string; reward_type: string }> = {};
	if (rewardIds.length > 0) {
		const { data: rewards } = await supabase
			.from("gacha_rewards")
			.select("id, name, reward_type")
			.in("id", rewardIds);
		if (rewards) {
			rewardsMap = Object.fromEntries(
				rewards.map((r) => [r.id, { name: r.name, reward_type: r.reward_type }])
			);
		}
	}

	const items = (history ?? []).map((h) => ({
		id: h.id,
		reward_id: h.reward_id,
		played_at: h.played_at,
		reward: rewardsMap[h.reward_id] ?? null,
	}));

	return NextResponse.json({ items, total: count ?? 0, limit, offset });
}
