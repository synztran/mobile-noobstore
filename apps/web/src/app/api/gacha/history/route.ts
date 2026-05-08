import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// ─── GET /api/gacha/history?event_id=X&page=1 ───────────────
// Returns the authenticated user's play history, paginated (10/page)
export async function GET(req: NextRequest) {
	const { searchParams } = new URL(req.url);
	const eventId = Number(searchParams.get("event_id"));
	const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
	const limit = 10;
	const offset = (page - 1) * limit;

	if (!eventId || isNaN(eventId)) {
		return NextResponse.json(
			{ error: "event_id query param is required" },
			{ status: 400 },
		);
	}

	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const { data, error, count } = await supabase
		.from("gacha_history")
		.select(
			"id, played_at, reward:gacha_rewards(id, reward_type, name, description, value, thumbnail_url, is_golden)",
			{ count: "exact" },
		)
		.eq("user_id", user.id)
		.eq("event_id", eventId)
		.order("played_at", { ascending: false })
		.range(offset, offset + limit - 1);

	if (error) {
		return NextResponse.json({ error: error.message }, { status: 500 });
	}

	return NextResponse.json({
		history: data ?? [],
		total: count ?? 0,
		page,
		hasMore: (count ?? 0) > offset + limit,
	});
}
