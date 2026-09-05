import { triggerMissionProgress } from "@/modules/gacha/server/missions";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

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

  const { event_id, mission_type, context = {} } = body;

  if (!event_id || !mission_type) {
    return NextResponse.json(
      { error: "event_id and mission_type are required" },
      { status: 400 }
    );
  }

  const result = await triggerMissionProgress(
    supabase,
    user.id,
    event_id,
    mission_type,
    context
  );
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ completed: result.completed });
}