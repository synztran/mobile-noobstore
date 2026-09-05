import { drawGacha } from "@/modules/gacha/server/draw";
import { getGachaEvent } from "@/modules/gacha/server/event";
import { getAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// ─── GET /api/gacha?event_id=X ──────────────────────────────
// Returns: event info, rewards (with computed percent), user token count
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

  const result = await getGachaEvent(supabase, eventId, user?.id ?? null);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result.data);
}

// ─── POST /api/gacha ─────────────────────────────────────────
// Body: { event_id: number }
// Atomically deducts 1 token, runs weighted draw, records history
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  // Resolved per-request (not module scope) so builds never require the
  // service-role key to be present in the build environment.
  const admin = getAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { event_id?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  const eventId = Number(body.event_id);
  if (!eventId || isNaN(eventId)) {
    return NextResponse.json(
      { error: "event_id is required" },
      { status: 400 }
    );
  }

  const result = await drawGacha(supabase, admin, user.id, eventId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ reward: result.reward });
}