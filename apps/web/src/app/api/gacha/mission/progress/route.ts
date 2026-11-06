import { getAdminClient } from "@/lib/supabase/admin";
import { triggerMissionProgress } from "@/modules/gacha/server/missions";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { isClientMissionTriggerAllowed } from "@/modules/gacha/server/mission-trigger";

export const dynamic = "force-dynamic";

/**
 * POST /api/gacha/mission/progress
 *
 * Trigger mission progress for the authenticated user.
 * Body: { event_id: number, mission_type: string, context?: Record<string, unknown> }
 *
 * Returns: { completed: Array<{ mission_id: number }> }
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  // process_mission_progress is service-role only (migration 131): it is
  // SECURITY DEFINER and takes p_user_id as a parameter, so the identity must
  // come from this route's verified session, never from the RPC argument.
  const admin = getAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    event_id: number;
    mission_type: string;
    context?: Record<string, unknown>;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { event_id, mission_type } = body;

  // Browser-triggered missions are limited to login only. Order/spend/play
  // progress is recorded by trusted server flows (checkout and gacha draw).
  if (!event_id || !isClientMissionTriggerAllowed(mission_type)) {
    return NextResponse.json(
      { error: "Only login mission progress may be triggered by the client" },
      { status: 400 }
    );
  }

  const result = await triggerMissionProgress(
    admin,
    user.id,
    event_id,
    mission_type,
    {}
  );
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status }
    );
  }

  return NextResponse.json({ completed: result.completed });
}
