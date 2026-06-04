import { getAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/gacha/events/[id]/reward-history
 * Returns paginated list of users who joined the raffle with play count and reward count.
 * Query params: limit (default 20), offset (default 0)
 */
export async function GET(
	req: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	const { id } = await params;
	const supabase = getAdminClient();
	const limit = Number(req.nextUrl.searchParams.get("limit")) || 20;
	const offset = Number(req.nextUrl.searchParams.get("offset")) || 0;
	const search = req.nextUrl.searchParams.get("search")?.trim() || "";

	// Get all history for this event to aggregate per user
	const { data: allHistory, error } = await supabase
		.from("gacha_history")
		.select("user_id, reward_id, played_at")
		.eq("event_id", id);

	if (error) return NextResponse.json({ error: error.message }, { status: 500 });

	// Aggregate per user
	const userMap = new Map<string, { play_count: number; reward_count: number; last_played_at: string }>();
	for (const row of allHistory ?? []) {
		const existing = userMap.get(row.user_id);
		if (existing) {
			existing.play_count++;
			if (row.reward_id) existing.reward_count++;
			if (row.played_at > existing.last_played_at) existing.last_played_at = row.played_at;
		} else {
			userMap.set(row.user_id, {
				play_count: 1,
				reward_count: row.reward_id ? 1 : 0,
				last_played_at: row.played_at,
			});
		}
	}

	// If searching by email, fetch matching user IDs first
	let filteredUserIds: Set<string> | null = null;
	if (search) {
		const { data: matchedUsers } = await supabase
			.from("users")
			.select("id")
			.ilike("email", `%${search}%`);
		filteredUserIds = new Set((matchedUsers ?? []).map((u) => u.id));
	}

	// Sort by play_count desc, then filter and paginate
	const sorted = [...userMap.entries()]
		.filter(([uid]) => !filteredUserIds || filteredUserIds.has(uid))
		.sort((a, b) => b[1].play_count - a[1].play_count);

	const total = sorted.length;
	const page = sorted.slice(offset, offset + limit);

	// Fetch user details
	const userIds = page.map(([uid]) => uid);
	let usersMap: Record<string, { email: string; full_name: string | null }> = {};
	if (userIds.length > 0) {
		const { data: users } = await supabase
			.from("users")
			.select("id, email, first_name, last_name")
			.in("id", userIds);
		if (users) {
			usersMap = Object.fromEntries(
				users.map((u) => [
					u.id,
					{ email: u.email, full_name: [u.first_name, u.last_name].filter(Boolean).join(" ") || null },
				])
			);
		}
	}

	const items = page.map(([userId, stats]) => ({
		user_id: userId,
		email: usersMap[userId]?.email ?? null,
		full_name: usersMap[userId]?.full_name ?? null,
		play_count: stats.play_count,
		reward_count: stats.reward_count,
		last_played_at: stats.last_played_at,
	}));

	return NextResponse.json({ items, total, limit, offset });
}
