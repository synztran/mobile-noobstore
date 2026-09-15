import "server-only";

import { getCache, setCache } from "@/lib/redis/cache";
import type { Database } from "@/lib/supabase/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

type Supabase = SupabaseClient<Database>;

export type GachaWinnersResult =
  | { ok: true; winners: unknown[] }
  | { ok: false; error: string; status: number };

/**
 * Public: recent winners for the ticker. Only exposes first name + last
 * initial for privacy. Cached 30s — the draw route invalidates the key.
 */
export async function getRecentWinners(
  supabase: Supabase,
  eventId: number,
  limit: number
): Promise<GachaWinnersResult> {
  const cacheKey = `gacha:winners:${eventId}`;
  const cached = await getCache<{ winners: unknown[] }>(cacheKey);
  if (cached) {
    return { ok: true, winners: cached.winners };
  }

  // Step 1: fetch history + reward (no join to auth.users — not a public FK)
  const { data: historyRows, error } = await supabase
    .from("gacha_history")
    .select(
      "user_id, played_at, reward:gacha_rewards(name, is_golden, reward_type)"
    )
    .eq("event_id", eventId)
    .neq("reward_id", 5)
    .order("played_at", { ascending: false })
    .limit(limit);

  if (error) {
    return { ok: false, error: error.message, status: 500 };
  }

  if (!historyRows || historyRows.length === 0) {
    return { ok: true, winners: [] };
  }

  // Step 2: fetch user names from public.users for the collected user_ids
  const userIds = [...new Set(historyRows.map((r) => r.user_id))];
  const { data: users } = await supabase
    .from("users")
    .select("id, first_name, last_name")
    .in("id", userIds);

  const userMap = new Map((users ?? []).map((u) => [u.id, u]));

  // Step 3: compose masked winner list
  const winners = historyRows.map((row) => {
    const user = userMap.get(row.user_id);
    const reward = Array.isArray(row.reward) ? row.reward[0] : row.reward;
    const firstName = user?.first_name ?? "Someone";
    const lastInitial = user?.last_name
      ? user.last_name.charAt(0).toUpperCase() + "."
      : "";
    return {
      displayName: `${firstName} ${lastInitial}`.trim(),
      rewardName: reward?.name ?? "a prize",
      isGolden: reward?.is_golden ?? false,
      rewardType: reward?.reward_type ?? "",
      playedAt: row.played_at,
    };
  });

  const response = { winners };
  // Cache for 30 s — POST /api/gacha invalidates this key after each draw
  await setCache(cacheKey, response, 30);
  return { ok: true, winners };
}