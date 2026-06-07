/**
 * Noobstore Points (NSP) — server-side service.
 *
 * All functions are server-only (use service-role / SSR Supabase client).
 * Import this only inside API route handlers or server components.
 *
 * Activity → points earning map:
 *   order_delivered   → FLOOR(total_price_vnd * rule.rate_value / 100)
 *   service_completed → FLOOR(service_price_vnd * rule.rate_value / 100)
 *   gacha_reward      → direct point amount from reward value field
 *   gacha_event       → flat rule value
 *   social_event      → flat rule value
 *   gift_card         → full gift card face value (handled by RPC)
 *   admin_adjustment  → admin-supplied delta
 */

import type { SupabaseClient } from "@supabase/supabase-js";

type Supabase = SupabaseClient<any>;

// ─── Internal RPC helper ──────────────────────────────────────

async function callRpc<T>(
  supabase: Supabase,
  fn: string,
  args: Record<string, unknown>
): Promise<T[]> {
  const { data, error } = await (
    supabase.rpc as unknown as (
      fn: string,
      args: Record<string, unknown>
    ) => Promise<{ data: unknown; error: { message: string } | null }>
  )(fn, args);

  if (error) throw new Error(`[points] ${fn} failed: ${error.message}`);
  return Array.isArray(data) ? (data as T[]) : [];
}

// ─── Types ────────────────────────────────────────────────────

export interface PointsResult {
  transactionId: number;
  newBalance: number;
}

export interface GiftCardRedeemResult {
  giftCardId: number;
  pointsCredited: number;
  newBalance: number;
}

// ─── Earn ─────────────────────────────────────────────────────

/**
 * Compute earned points for an amount-based activity, then credit them.
 * Returns null if the computed points are 0 (rule inactive or rate=0).
 */
export async function earnPointsForAmount(
  supabase: Supabase,
  userId: string,
  sourceType: "order_delivered" | "service_completed",
  amountVnd: number,
  sourceRef?: string,
  note?: string
): Promise<PointsResult | null> {
  // Ask DB to compute the amount according to the active rule
  const rows = await callRpc<{ compute_points_for_amount: string }>(
    supabase,
    "compute_points_for_amount",
    { p_rule_type: sourceType, p_amount: amountVnd }
  );

  const points = Number(rows[0]?.compute_points_for_amount ?? 0);
  if (!points || points <= 0) return null;

  return earnPointsFixed(
    supabase,
    userId,
    sourceType,
    BigInt(points),
    sourceRef,
    note
  );
}

/**
 * Credit a fixed number of points (pre-computed or flat-rate activities).
 */
export async function earnPointsFixed(
  supabase: Supabase,
  userId: string,
  sourceType: string,
  points: bigint | number,
  sourceRef?: string,
  note?: string
): Promise<PointsResult> {
  const [row] = await callRpc<{ transaction_id: string; new_balance: string }>(
    supabase,
    "earn_points",
    {
      p_user_id: userId,
      p_source_type: sourceType,
      p_source_ref: sourceRef ?? null,
      p_amount: Number(points),
      p_note: note ?? null,
    }
  );

  return {
    transactionId: Number(row.transaction_id),
    newBalance: Number(row.new_balance),
  };
}

// ─── Spend ────────────────────────────────────────────────────

/**
 * Deduct points from a customer's balance.
 * Throws if insufficient balance (propagates DB exception).
 */
export async function spendPoints(
  supabase: Supabase,
  userId: string,
  points: number,
  sourceType: "voucher_exchange" | "product_exchange" | "admin_adjustment",
  sourceRef?: string,
  note?: string
): Promise<PointsResult> {
  const [row] = await callRpc<{ transaction_id: string; new_balance: string }>(
    supabase,
    "spend_points",
    {
      p_user_id: userId,
      p_amount: points,
      p_source_type: sourceType,
      p_source_ref: sourceRef ?? null,
      p_note: note ?? null,
    }
  );

  return {
    transactionId: Number(row.transaction_id),
    newBalance: Number(row.new_balance),
  };
}

// ─── Admin adjust ─────────────────────────────────────────────

export async function adminAdjustPoints(
  supabase: Supabase,
  adminId: string,
  targetUserId: string,
  delta: number,
  note?: string
): Promise<PointsResult> {
  const [row] = await callRpc<{ transaction_id: string; new_balance: string }>(
    supabase,
    "adjust_points",
    {
      p_admin_id: adminId,
      p_user_id: targetUserId,
      p_delta: delta,
      p_note: note ?? null,
    }
  );

  return {
    transactionId: Number(row.transaction_id),
    newBalance: Number(row.new_balance),
  };
}

// ─── Gift card ────────────────────────────────────────────────

export async function redeemGiftCard(
  supabase: Supabase,
  userId: string,
  code: string
): Promise<GiftCardRedeemResult> {
  const [row] = await callRpc<{
    gift_card_id: string;
    points_credited: string;
    new_balance: string;
  }>(supabase, "redeem_gift_card", {
    p_user_id: userId,
    p_code: code,
  });

  return {
    giftCardId: Number(row.gift_card_id),
    pointsCredited: Number(row.points_credited),
    newBalance: Number(row.new_balance),
  };
}

// ─── Gacha reward point grant ─────────────────────────────────

/**
 * Called when a gacha reward of type 'point' is drawn.
 * `pointValue` comes from gacha_rewards.value (stored as text).
 */
export async function earnPointsFromGachaReward(
  supabase: Supabase,
  userId: string,
  rewardId: number,
  pointValue: number
): Promise<PointsResult | null> {
  if (!pointValue || pointValue <= 0) return null;
  return earnPointsFixed(
    supabase,
    userId,
    "gacha_reward",
    pointValue,
    String(rewardId),
    `Gacha reward #${rewardId}: ${pointValue} pts`
  );
}
