import "server-only";

import { getCache, setCache } from "@/lib/redis/cache";
import type { Database } from "@/lib/supabase/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";
type Supabase = SupabaseClient<Database>;

export type GachaEventResult =
  | {
      ok: true;
      data: {
        event: unknown;
        rewards: unknown[];
        token_count: number;
      };
    }
  | { ok: false; error: string; status: number };

/**
 * Load an active gacha event, its rewards (with computed percent), and the
 * authenticated user's token count. Event + rewards are cached 60s — the
 * token count is per-user and never cached.
 */
export async function getGachaEvent(
  supabase: Supabase,
  eventId: number,
  userId: string | null
): Promise<GachaEventResult> {
  const cacheKey = `gacha:event:${eventId}`;
  const cached = await getCache<{
    event: unknown;
    rewards: unknown[];
  }>(cacheKey);

  let event: unknown;
  let rewardsWithPercent: unknown[];

  if (cached) {
    event = cached.event;
    rewardsWithPercent = cached.rewards;
  } else {
    const [eventResult, rewardsResult] = await Promise.all([
      supabase
        .from("gacha_events")
        .select(
          "id, name, description, start_at, end_at, free_tokens_per_grant, free_token_interval_days, is_active"
        )
        .eq("id", eventId)
        .eq("is_active", true)
        .maybeSingle(),
      supabase
        .from("gacha_rewards")
        .select(
          "id, reward_type, name, description, value, thumbnail_url, weight, max_quantity, claimed_count, is_golden, percent_display"
        )
        .eq("event_id", eventId)
        .filter("is_active", "eq", true)
        .order("percent_display", { ascending: true }),
    ]);

    if (eventResult.error) {
      return { ok: false, error: eventResult.error.message, status: 500 };
    }
    if (!eventResult.data) {
      return { ok: false, error: "Sự kiện chưa diễn ra", status: 404 };
    }
    if (rewardsResult.error) {
      return { ok: false, error: rewardsResult.error.message, status: 500 };
    }

    const rewards = rewardsResult.data ?? [];
    rewardsWithPercent = rewards.map((r) => {
      const { weight, percent_display, ...rest } = r;
      return {
        ...rest,
        percent: r.percent_display,
      };
    });
    event = eventResult.data;

    // Cache event + rewards for 60 s (token_count is per-user, never cached)
    await setCache(cacheKey, { event, rewards: rewardsWithPercent }, 60);
  }

  let tokenCount = 0;
  if (userId) {
    const { data: tokenRow } = await supabase
      .from("user_event_tokens")
      .select("token_count")
      .eq("user_id", userId)
      .eq("event_id", eventId)
      .maybeSingle();
    tokenCount = tokenRow?.token_count ?? 0;
  }

  return {
    ok: true,
    data: {
      event,
      rewards: rewardsWithPercent,
      token_count: tokenCount,
    },
  };
}