import { getCache, setCache } from "@/lib/redis/cache";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function normalizeMissionRequirement(
  missionType: string,
  requirement: unknown
): { amount?: number; count?: number } {
  const raw =
    requirement && typeof requirement === "object"
      ? (requirement as Record<string, unknown>)
      : {};

  if (missionType === "order_min_price" || missionType === "spend_amount") {
    const amount = Number(raw.min_price ?? raw.amount ?? 0);
    return { amount: Number.isFinite(amount) ? amount : 0 };
  }

  if (missionType === "order_count") {
    const count = Number(raw.count ?? 0);
    return { count: Number.isFinite(count) ? count : 0 };
  }

  if (
    missionType === "first_login" ||
    missionType === "login_count" ||
    missionType === "play_count"
  ) {
    return { count: Number(raw.count ?? 1) };
  }

  const amount = Number(raw.amount ?? 0);
  const count = Number(raw.count ?? 0);

  return {
    ...(Number.isFinite(amount) && amount > 0 ? { amount } : {}),
    ...(Number.isFinite(count) && count > 0 ? { count } : {}),
  };
}

function normalizeMissionProgress(
  missionType: string,
  progress: unknown,
  completedAt: string | null
): number | null {
  const raw =
    progress && typeof progress === "object"
      ? (progress as Record<string, unknown>)
      : null;

  if (missionType === "first_login" || missionType === "login_count") {
    return completedAt ? 1 : 0;
  }

  if (!raw) {
    return null;
  }

  if (missionType === "order_min_price" || missionType === "spend_amount") {
    const amount = Number(raw.total_spent ?? raw.amount ?? 0);
    return Number.isFinite(amount) ? amount : null;
  }

  const count = Number(raw.count ?? raw.amount ?? 0);
  return Number.isFinite(count) ? count : null;
}

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

  // Cache the missions list (not per-user progress) for 5 min
  // Missions are static per event — they don't change after launch
  const missionsCacheKey = `gacha:missions:${eventId}`;
  const [
    {
      data: { user },
    },
    cachedMissions,
  ] = await Promise.all([
    supabase.auth.getUser(),
    getCache<
      {
        id: number;
        name: string;
        description: string | null;
        mission_type: string;
        requirement: unknown;
        token_reward: number;
        show_trigger: boolean;
        is_active: boolean;
      }[]
    >(missionsCacheKey),
  ]);

  let missions:
    | {
        id: number;
        name: string;
        description: string | null;
        mission_type: string;
        requirement: unknown;
        token_reward: number;
        show_trigger: boolean;
        is_active: boolean;
      }[]
    | null = cachedMissions;

  if (!missions) {
    const { data, error } = await supabase
      .from("gacha_missions")
      .select(
        "id, name, description, mission_type, requirement, token_reward, show_trigger, is_active"
      )
      .eq("event_id", eventId)
      .eq("show_trigger", true)
      .eq("is_active", true)
      .order("id");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    missions = data ?? [];
    await setCache(missionsCacheKey, missions, 300);
  }

  if (!user) {
    // Unauthenticated: return missions without progress
    return NextResponse.json({
      missions: (missions ?? []).map((m) => ({
        ...m,
        requirement: normalizeMissionRequirement(m.mission_type, m.requirement),
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
          .select("mission_id, progress, completed_at, claimed_at")
          .in("mission_id", missionIds)
          .eq("user_id", user.id)
      : { data: [] };

  const progressMap = new Map(
    (progressRows ?? []).map((p) => [p.mission_id, p])
  );

  const missionsWithProgress = (missions ?? []).map((m) => {
    const prog = progressMap.get(m.id);
    return {
      ...m,
      requirement: normalizeMissionRequirement(m.mission_type, m.requirement),
      progress: normalizeMissionProgress(
        m.mission_type,
        prog?.progress ?? null,
        prog?.completed_at ?? null
      ),
      completed_at: prog?.completed_at ?? null,
      claimed_at: prog?.claimed_at ?? null,
    };
  });

  return NextResponse.json({ missions: missionsWithProgress });
}
