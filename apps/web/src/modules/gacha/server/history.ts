import "server-only";

import type { Database } from "@/lib/supabase/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

type Supabase = SupabaseClient<Database>;

export type GachaHistoryResult =
  | {
      ok: true;
      history: unknown[];
      total: number;
      page: number;
      hasMore: boolean;
    }
  | { ok: false; error: string; status: number };

/**
 * Load the authenticated user's play history for an event, paginated (10/page).
 */
export async function getGachaHistory(
  supabase: Supabase,
  userId: string,
  eventId: number,
  page: number
): Promise<GachaHistoryResult> {
  const limit = 10;
  const offset = (page - 1) * limit;

  const { data, error, count } = await supabase
    .from("gacha_history")
    .select(
      "id, played_at, reward:gacha_rewards(id, reward_type, name, description, value, thumbnail_url, is_golden)",
      { count: "exact" }
    )
    .eq("user_id", userId)
    .eq("event_id", eventId)
    .order("played_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return { ok: false, error: error.message, status: 500 };
  }

  return {
    ok: true,
    history: data ?? [],
    total: count ?? 0,
    page,
    hasMore: (count ?? 0) > offset + limit,
  };
}