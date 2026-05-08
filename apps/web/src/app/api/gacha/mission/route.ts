import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// ─── GET /api/gacha/mission?event_id=X ───────────────────────
// Returns missions for the event + authenticated user's progress on each
export async function GET(req: NextRequest) {
	const { searchParams } = new URL(req.url);
	const eventId = Number(searchParams.get("event_id"));

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

	const { data: missions, error } = await supabase
		.from("gacha_missions")
		.select(
			"id, name, description, mission_type, requirement, token_reward",
		)
		.eq("event_id", eventId)
		.order("id");

	if (error) {
		return NextResponse.json({ error: error.message }, { status: 500 });
	}

	if (!user) {
		// Unauthenticated: return missions without progress
		return NextResponse.json({
			missions: (missions ?? []).map((m) => ({
				...m,
				progress: null,
				completed_at: null,
			})),
		});
	}

	// Fetch user's progress for all missions of this event in one query
	const missionIds = (missions ?? []).map((m) => m.id);
	const { data: progressRows } =
		missionIds.length > 0
			? await supabase
					.from("user_mission_progress")
					.select("mission_id, progress, completed_at")
					.in("mission_id", missionIds)
					.eq("user_id", user.id)
			: { data: [] };

	const progressMap = new Map(
		(progressRows ?? []).map((p) => [p.mission_id, p]),
	);

	const missionsWithProgress = (missions ?? []).map((m) => {
		const prog = progressMap.get(m.id);
		return {
			...m,
			progress: prog?.progress ?? null,
			completed_at: prog?.completed_at ?? null,
		};
	});

	return NextResponse.json({ missions: missionsWithProgress });
}
