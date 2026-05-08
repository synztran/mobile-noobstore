import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// ─── GET /api/gacha/recent-winners?event_id=X&limit=10 ──────
// Public: returns recent winners for the ticker
// Only exposes first name + last initial for privacy
export async function GET(req: NextRequest) {
	const { searchParams } = new URL(req.url);
	const eventId = Number(searchParams.get("event_id"));
	const limit = Math.min(
		20,
		Math.max(5, Number(searchParams.get("limit") ?? "10")),
	);

	if (!eventId || isNaN(eventId)) {
		return NextResponse.json(
			{ error: "event_id query param is required" },
			{ status: 400 },
		);
	}

	const supabase = await createClient();

	// Step 1: fetch history + reward (no join to auth.users — not a public FK)
	const { data: historyRows, error } = await supabase
		.from("gacha_history")
		.select("user_id, played_at, reward:gacha_rewards(name, is_golden)")
		.eq("event_id", eventId)
		.order("played_at", { ascending: false })
		.limit(limit);

	if (error) {
		return NextResponse.json({ error: error.message }, { status: 500 });
	}

	if (!historyRows || historyRows.length === 0) {
		return NextResponse.json({ winners: [] });
	}

	// Step 2: fetch user names from public.users for the collected user_ids
	const userIds = [...new Set(historyRows.map((r) => r.user_id))];
	const { data: users } = await supabase
		.from("users")
		.select("id, first_name, last_name")
		.in("id", userIds);

	const userMap = new Map((users ?? []).map((u) => [u.id, u]));

	// Step 3: compose masked winner list
	const winners = historyRows.map((row) => {
		const user = userMap.get(row.user_id);
		const reward = Array.isArray(row.reward) ? row.reward[0] : row.reward;
		const firstName = user?.first_name ?? "Someone";
		const lastInitial = user?.last_name
			? user.last_name.charAt(0).toUpperCase() + "."
			: "";
		return {
			displayName: `${firstName} ${lastInitial}`.trim(),
			rewardName: reward?.name ?? "a prize",
			isGolden: reward?.is_golden ?? false,
			playedAt: row.played_at,
		};
	});

	return NextResponse.json({ winners });
}
