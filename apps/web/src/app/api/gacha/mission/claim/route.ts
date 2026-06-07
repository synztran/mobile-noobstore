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

  const { data, error } = await supabase.rpc("claim_mission_reward", {
    p_user_id: user.id,
    p_event_id: eventId,
    p_mission_id: missionId,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const result = data as {
    error?: string;
    success?: boolean;
    token_reward?: number;
  };

  if (result?.error) {
    const statusMap: Record<string, number> = {
      mission_not_found: 404,
      mission_not_completed: 409,
      already_claimed: 409,
      mission_config_not_found: 404,
    };
    return NextResponse.json(
      { error: result.error },
      { status: statusMap[result.error] ?? 400 }
    );
  }

  return NextResponse.json({
    success: true,
    token_reward: result?.token_reward ?? 0,
  });
}
