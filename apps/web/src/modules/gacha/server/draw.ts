import "server-only";

import { CACHE_KEYS, invalidateCache } from "@/lib/redis/cache";
import { earnPointsFromGachaReward } from "@/lib/points/service";
import { randomFloat } from "@/lib/random";
import type { Database } from "@/lib/supabase/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";
import { triggerMissionServer } from "./missions";

type Supabase = SupabaseClient<Database>;
type Admin = Awaited<ReturnType<typeof import("@/lib/supabase/admin")["getAdminClient"]>>;

export type GachaDrawResult =
  | { ok: true; reward: unknown }
  | { ok: false; error: string; status: number };

/**
 * Atomic draw: deduct 1 token, run the weighted draw, CAS-increment the
 * reward's claimed_count (refunding the token whenever anything invalidates a
 * fair draw), record history, invalidate caches, and attach side effects
 * (points earning + play_count mission trigger).
 *
 * All failure paths that happen after the token is deducted refund it.
 */
export async function drawGacha(
  supabase: Supabase,
  admin: Admin,
  userId: string,
  eventId: number
): Promise<GachaDrawResult> {
  // Refund helper — restores the token when a post-decrement step fails.
  // Refund uses admin client — user_event_tokens UPDATE is admin-only
  const refund = async () => {
    await admin
      .from("user_event_tokens")
      .update({ token_count: currentTokens })
      .eq("user_id", userId)
      .eq("event_id", eventId);
  };

  // ── Round-trip 1: event + token count in parallel ──────────────────────────
  const [
    { data: event, error: eventError },
    { data: tokenRow, error: tokenError },
  ] = await Promise.all([
    supabase
      .from("gacha_events")
      .select("id, start_at, end_at, is_active")
      .eq("id", eventId)
      .eq("is_active", true)
      .maybeSingle(),
    supabase
      .from("user_event_tokens")
      .select("token_count")
      .eq("user_id", userId)
      .eq("event_id", eventId)
      .maybeSingle(),
  ]);

  if (eventError) {
    return { ok: false, error: eventError.message, status: 500 };
  }
  if (!event) {
    return { ok: false, error: "Sự kiện chưa diễn ra", status: 404 };
  }

  const now = new Date();
  if (now < new Date(event.start_at) || now > new Date(event.end_at)) {
    return { ok: false, error: "Sự kiện chưa diễn ra", status: 400 };
  }

  if (tokenError) {
    console.error("[gacha POST] token query error:", tokenError);
    return {
      ok: false,
      error: "Token query failed",
      status: 500,
    };
  }

  const currentTokens = tokenRow?.token_count ?? 0;
  if (currentTokens <= 0) {
    return { ok: false, error: "Not enough tokens", status: 400 };
  }

  // ── Round-trip 2: atomic token decrement (admin client — bypasses RLS) ────
  const { data: updated, error: updateError } = await admin
    .from("user_event_tokens")
    .update({ token_count: currentTokens - 1 })
    .eq("user_id", userId)
    .eq("event_id", eventId)
    .eq("token_count", currentTokens)
    .select("id");

  if (updateError || !updated || updated.length === 0) {
    return {
      ok: false,
      error: "Token update conflict, please retry",
      status: 409,
    };
  }

  // ── Round-trip 3: blocked check + rewards fetch in parallel ────────────────
  const [{ data: blocked }, { data: allRewards, error: rewardsError }] =
    await Promise.all([
      supabase
        .from("gacha_event_blocked_users")
        .select("user_id")
        .eq("event_id", eventId)
        .eq("user_id", userId)
        .maybeSingle(),
      supabase
        .from("gacha_rewards")
        .select(
          "id, reward_type, name, description, value, thumbnail_url, weight, max_quantity, claimed_count, is_golden"
        )
        .eq("event_id", eventId)
        .filter("is_active", "eq", true),
    ]);

  if (rewardsError || !allRewards || allRewards.length === 0) {
    // Refund token on configuration error
    await refund();
    return {
      ok: false,
      error: "No rewards configured for this event",
      status: 500,
    };
  }

  // ── Filter + weighted draw (in-memory) ─────────────────────────────────────
  const isGoldenBlocked = !!blocked;

  const eligible = allRewards.filter((r) => {
    // Display-only rewards (weight 0) such as the golden ball show a virtual
    // percent_display but must never be drawn — skip them here.
    if (!r.weight || r.weight <= 0) return false;
    if (isGoldenBlocked && r.is_golden) return false;
    if (r.max_quantity !== null && r.claimed_count >= r.max_quantity)
      return false;
    return true;
  });

  if (eligible.length === 0) {
    await refund();
    return {
      ok: false,
      error: "No eligible rewards available",
      status: 409,
    };
  }

  const totalWeight = eligible.reduce((sum, r) => sum + (r.weight ?? 0), 0);
  let roll = randomFloat() * totalWeight;
  let drawn = eligible[eligible.length - 1]; // safe fallback
  for (const reward of eligible) {
    roll -= reward.weight ?? 0;
    if (roll <= 0) {
      drawn = reward;
      break;
    }
  }

  // ── Round-trip 4: ATOMIC claimed_count increment (guards oversell) ───────
  // The earlier claimed_count read was advisory only. Incrementing with a
  // `.eq("claimed_count", drawn.claimed_count)` condition makes the write
  // compare-and-set: if another concurrent draw claimed the last unit first,
  // zero rows are updated and we refund the token instead of overselling.
  const { data: claimed, error: claimedError } = await admin
    .from("gacha_rewards")
    .update({ claimed_count: drawn.claimed_count + 1 })
    .eq("id", drawn.id)
    .eq("claimed_count", drawn.claimed_count)
    .select("id");

  if (claimedError || !claimed || claimed.length === 0) {
    // Lost the race — reward just ran out. Refund the token.
    await refund();
    return {
      ok: false,
      error: "Phần thưởng vừa hết lượt, vui lòng thử lại",
      status: 409,
    };
  }

  // ── Round-trip 5: history + cache invalidation in parallel ────────────────
  try {
    await Promise.all([
      supabase.from("gacha_history").insert({
        user_id: userId,
        event_id: eventId,
        reward_id: drawn.id,
      }),
      invalidateCache(`gacha:event:${eventId}`, `gacha:winners:${eventId}`),
    ]);
  } catch (err) {
    console.error("[gacha POST] post-draw side-effects failed:", err);
    // Non-fatal: reward was already drawn and token deducted — do not refund.
  }

  // ── Earn NSP points when reward type is 'point' ───────────────────────────
  if (drawn.reward_type === "point") {
    const pointValue = Number(drawn.value ?? 0);
    if (pointValue > 0) {
      try {
        await earnPointsFromGachaReward(admin, userId, drawn.id, pointValue);
        await invalidateCache(CACHE_KEYS.pointsBalance(userId));
      } catch (err) {
        console.error("[gacha POST] failed to earn points:", err);
      }
    }
  }

  // ── Trigger play_count gacha mission ─────────────────────────────────────
  try {
    await triggerMissionServer(supabase, userId, eventId, "play_count");
  } catch (err) {
    console.error("[gacha POST] play_count mission trigger failed:", err);
  }

  return { ok: true, reward: drawn };
}