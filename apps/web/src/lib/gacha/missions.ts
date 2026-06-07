/**
 * Mission trigger utilities — call from client components or API routes.
 *
 * Client-side helpers post to /api/gacha/mission/progress.
 * The server-side helper is for use inside API route handlers.
 */

// ─── Client-side trigger ──────────────────────────────────────────────────────

// Must match the mission_type column values in gacha_missions table
export type MissionType =
  | "login_count"
  | "order_count"
  | "spend_amount"
  | "play_count";

interface TriggerResult {
  completed: Array<{ mission_id: number; newly_completed: boolean }>;
}

/**
 * Trigger a mission progress update from the browser.
 * Fire-and-forget safe — errors are caught and logged.
 */
export async function triggerMissionClient(
  eventId: number,
  missionType: MissionType,
  context: Record<string, unknown> = {}
): Promise<TriggerResult> {
  try {
    const res = await fetch("/api/gacha/mission/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event_id: eventId,
        mission_type: missionType,
        context,
      }),
    });
    if (!res.ok) return { completed: [] };
    return (await res.json()) as TriggerResult;
  } catch {
    return { completed: [] };
  }
}

// ─── Server-side trigger (for use inside API routes) ─────────────────────────
// Import createAdminClient only on the server; do not bundle in client code.

/**
 * Trigger a mission progress update from a server API route.
 * Uses the service-role client so it can bypass RLS.
 * Returns the list of missions that were newly completed.
 */
export async function triggerMissionServer(
  supabase: Awaited<
    ReturnType<(typeof import("@/lib/supabase/server"))["createClient"]>
  >,
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
      ? (
          data as Array<{ r_mission_id: number; r_newly_completed: boolean }>
        ).map((row) => ({
          mission_id: row.r_mission_id,
          newly_completed: row.r_newly_completed,
        }))
      : [];
  } catch (err) {
    console.error("[triggerMission] unexpected error:", err);
    return [];
  }
}
