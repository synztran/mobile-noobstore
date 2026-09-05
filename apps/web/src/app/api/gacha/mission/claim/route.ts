import { claimMissionReward } from "@/modules/gacha/server/missions";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// POST /api/gacha/mission/claim
// Body: { event_id: number; mission_id: number }
export async function POST(req: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const eventId = Number(body?.event_id);
  const missionId = Number(body?.mission_id);

  if (!eventId || !missionId || isNaN(eventId) || isNaN(missionId)) {
    return NextResponse.json(
      { error: "event_id and mission_id are required" },
      { status: 400 }
    );
  }

  const result = await claimMissionReward(
    supabase,
    user.id,
    eventId,
    missionId
  );
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({
    success: true,
    token_reward: result.token_reward,
  });
}