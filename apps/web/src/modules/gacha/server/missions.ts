import "server-only";

import { getCache, setCache } from "@/lib/redis/cache";
import type { Database } from "@/lib/supabase/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  MissionType,
  MissionProgressRow,
} from "@/modules/gacha/types";

type Supabase = SupabaseClient<Database>;

// ─── Requirement / progress normalization ────────────────────────────────────

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

// ─── GET missions ────────────────────────────────────────────────────────────

type MissionRow = {
  id: number;
  name: string;
  description: string | null;
  mission_type: string;
  requirement: unknown;
  token_reward: number;
  show_trigger: boolean;
};

export type GachaMissionsResult =
  | { ok: true; missions: unknown[] }
  | { ok: false; error: string; status: number };

/**
 * Load the event's missions (cached 5 min, static per event) and, when a user
 * is present, merge their per-mission progress.
 */
export async function getGachaMissions(
  supabase: Supabase,
  eventId: number,
  userId: string | null
): Promise<GachaMissionsResult> {
  const missionsCacheKey = `gacha:missions:${eventId}`;
  const cachedMissions = await getCache<MissionRow[]>(missionsCacheKey);

  let missions: MissionRow[] | null = cachedMissions;

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
      return { ok: false, error: error.message, status: 500 };
    }

    missions = (data ?? []) as unknown as MissionRow[];
    await setCache(missionsCacheKey, missions, 300);
  }

  if (!userId) {
    // Unauthenticated: return missions without progress
    return {
      ok: true,
      missions: (missions ?? []).map((m) => ({
        ...m,
        requirement: normalizeMissionRequirement(m.mission_type, m.requirement),
        progress: null,
        completed_at: null,
      })),
    };
  }

  // Fetch user's progress for all missions of this event in one query
  const missionIds = (missions ?? []).map((m) => m.id);
  const { data: progressRows } =
    missionIds.length > 0
      ? await supabase
          .from("user_mission_progress")
          .select("mission_id, progress, completed_at, claimed_at")
          .in("mission_id", missionIds)
          .eq("user_id", userId)
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

  return { ok: true, missions: missionsWithProgress };
}

// ─── POST claim ──────────────────────────────────────────────────────────────

export type GachaClaimResult =
  | { ok: true; token_reward: number }
  | { ok: false; error: string; status: number };

/** Claim a completed mission's token reward via the claim_mission_reward RPC. */
export async function claimMissionReward(
  supabase: Supabase,
  userId: string,
  eventId: number,
  missionId: number
): Promise<GachaClaimResult> {
  const { data, error } = await (
    supabase.rpc as unknown as (
      fn: string,
      args: Record<string, unknown>
    ) => Promise<{ data: unknown; error: { message: string } | null }>
  )("claim_mission_reward", {
    p_user_id: userId,
    p_event_id: eventId,
    p_mission_id: missionId,
  });

  if (error) {
    return { ok: false, error: error.message, status: 500 };
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
    return {
      ok: false,
      error: result.error,
      status: statusMap[result.error] ?? 400,
    };
  }

  return { ok: true, token_reward: result?.token_reward ?? 0 };
}

// ─── POST progress (client-triggered) ────────────────────────────────────────

export type GachaProgressResult =
  | { ok: true; completed: Array<{ mission_id: number }> }
  | { ok: false; error: string; status: number };

/**
 * Trigger mission progress for the authenticated user via
 * process_mission_progress RPC (client-initiated, e.g. from the browser).
 */
export async function triggerMissionProgress(
  supabase: Supabase,
  userId: string,
  eventId: number,
  missionType: string,
  context: Record<string, unknown>
): Promise<GachaProgressResult> {
  const { data, error } = await (
    supabase.rpc as unknown as (
      fn: string,
      args: Record<string, unknown>
    ) => Promise<{ data: unknown; error: { message: string } | null }>
  )("process_mission_progress", {
    p_user_id: userId,
    p_event_id: eventId,
    p_mission_type: missionType,
    p_context: context,
  });

  if (error) {
    console.error("[mission/progress] rpc error:", error);
    return { ok: false, error: error.message, status: 500 };
  }

  const completed = (Array.isArray(data) ? data : []) as Array<{
    mission_id: number;
    newly_completed: boolean;
  }>;

  return { ok: true, completed };
}

// ─── Server-side trigger (for use inside other API routes) ──────────────────
// Uses the request-scoped SSR client passed in. Swallows errors — missions are
// a non-critical side effect (e.g. after a checkout or a gacha draw).

/**
 * Trigger a mission progress update from a server API route.
 * Returns the list of missions that were newly completed.
 */
export async function triggerMissionServer(
  supabase: Supabase,
  userId: string,
  eventId: number,
  missionType: MissionType,
  context: Record<string, unknown> = {}
): Promise<Array<{ mission_id: number; newly_completed: boolean }>> {
  try {
    const { data, error } = await (
      supabase.rpc as unknown as (
        fn: string,
        args: Record<string, unknown>
      ) => Promise<{ data: unknown; error: { message: string } | null }>
    )("process_mission_progress", {
      p_user_id: userId,
      p_event_id: eventId,
      p_mission_type: missionType,
      p_context: context,
    });

    if (error) {
      console.error("[triggerMission] rpc error:", error);
      return [];
    }

    return Array.isArray(data)
      ? (data as MissionProgressRow[]).map((row) => ({
          mission_id: row.r_mission_id,
          newly_completed: row.r_newly_completed,
        }))
      : [];
  } catch (err) {
    console.error("[triggerMission] unexpected error:", err);
    return [];
  }
}