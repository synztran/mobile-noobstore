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

  const { data, error } = await (
    supabase.rpc as unknown as (
      fn: string,
      args: Record<string, unknown>
    ) => Promise<{ data: unknown; error: { message: string } | null }>
  )("process_mission_progress", {
    p_user_id: user.id,
    p_event_id: event_id,
    p_mission_type: mission_type,
    p_context: context,
  });

  if (error) {
    console.error("[mission/progress] rpc error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const completed = (Array.isArray(data) ? data : []) as Array<{
    mission_id: number;
    newly_completed: boolean;
  }>;

  return NextResponse.json({ completed });
}
