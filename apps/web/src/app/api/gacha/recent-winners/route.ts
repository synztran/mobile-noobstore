import { getRecentWinners } from "@/modules/gacha/server/winners";
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
    Math.max(5, Number(searchParams.get("limit") ?? "10"))
  );

  if (!eventId || isNaN(eventId)) {
    return NextResponse.json(
      { error: "event_id query param is required" },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const result = await getRecentWinners(supabase, eventId, limit);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ winners: result.winners });
}