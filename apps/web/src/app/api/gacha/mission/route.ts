import { getGachaMissions } from "@/modules/gacha/server/missions";
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
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const result = await getGachaMissions(
    supabase,
    eventId,
    user?.id ?? null
  );
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ missions: result.missions });
}