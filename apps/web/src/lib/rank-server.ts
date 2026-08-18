import type { CustomerRank, RankProgress, RankResponse } from "@/types/rank";
import { getAdminClient } from "@/lib/supabase/admin";
import { getPublicClient } from "@/lib/supabase/public";
import { getCache, setCache, CACHE_VERSION } from "@/lib/redis/cache";
import type { Database } from "@/lib/supabase/database.types";

type CustomerRankRow = Database["public"]["Tables"]["customer_ranks"]["Row"];

function mapRowToRank(row: CustomerRankRow): CustomerRank {
  const benefits = typeof row.benefits === "string"
    ? JSON.parse(row.benefits)
    : row.benefits;
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    level: row.level,
    color: row.color,
    iconUrl: row.icon_url,
    iconLabel: row.icon_label,
    minTotalSpent: Number(row.min_total_spent),
    minOrderCount: row.min_order_count,
    benefits: {
      pointsMultiplier: benefits.points_multiplier ?? 1,
      discountPercent: benefits.discount_percent ?? 0,
      freeShipping: benefits.free_shipping ?? false,
      exclusiveVoucherFrequency: benefits.exclusive_voucher_frequency ?? "none",
      prioritySupport: benefits.priority_support ?? false,
      flags: {
        pointsMultiplierEnabled: benefits.flags?.points_multiplier_enabled ?? false,
        discountPercentEnabled: benefits.flags?.discount_percent_enabled ?? false,
        freeShippingEnabled: benefits.flags?.free_shipping_enabled ?? false,
        exclusiveVoucherEnabled: benefits.flags?.exclusive_voucher_enabled ?? false,
        prioritySupportEnabled: benefits.flags?.priority_support_enabled ?? false,
      },
    },
  };
}

export async function getAllRanks(): Promise<CustomerRank[]> {
  const supabase = getPublicClient();
  const { data, error } = await supabase
    .from("customer_ranks")
    .select("*")
    .eq("is_active", true)
    .order("level", { ascending: true });

  if (error || !data) return [];
  return data.map(mapRowToRank);
}

async function getUserOrderStats(userId: string): Promise<{ totalSpent: number; orderCount: number }> {
  const supabase = getAdminClient();
  const { data, error } = await (
    supabase.rpc as unknown as (
      fn: "get_user_order_stats",
      args: { p_user_id: string }
    ) => Promise<{
      data: Array<{ total_spent: number; order_count: number }> | null;
      error: { message: string } | null;
    }>
  )("get_user_order_stats", { p_user_id: userId });

  if (error || !data || data.length === 0) {
    return { totalSpent: 0, orderCount: 0 };
  }

  return {
    totalSpent: Number(data[0].total_spent ?? 0),
    orderCount: Number(data[0].order_count ?? 0),
  };
}

export async function computeRank(userId: string): Promise<{ rankId: string | null; changed: boolean }> {
  const [allRanks, stats] = await Promise.all([
    getAllRanks(),
    getUserOrderStats(userId),
  ]);

  if (allRanks.length === 0) return { rankId: null, changed: false };

  const { totalSpent, orderCount } = stats;

  // Find the highest level rank the user qualifies for
  let newRank: CustomerRank | null = allRanks[0];
  for (const rank of allRanks) {
    if (totalSpent >= rank.minTotalSpent && orderCount >= rank.minOrderCount) {
      newRank = rank;
    } else {
      break;
    }
  }

  const supabase = getPublicClient();

  // Get current rank
  const { data: user } = await supabase
    .from("users")
    .select("rank_id")
    .eq("id", userId)
    .maybeSingle();

  const currentRankId = user?.rank_id ?? null;
  if (currentRankId === newRank?.id) {
    return { rankId: newRank?.id ?? null, changed: false };
  }

  // Update user rank
  const { error: updateError } = await supabase
    .from("users")
    .update({ rank_id: newRank?.id ?? null, rank_updated_at: new Date().toISOString() })
    .eq("id", userId);

  if (updateError) {
    console.error("[computeRank] Failed to update rank:", updateError);
    return { rankId: currentRankId, changed: false };
  }

  // Record history
  const { error: historyError } = await supabase
    .from("rank_history")
    .insert({
      user_id: userId,
      from_rank_id: currentRankId,
      to_rank_id: newRank?.id ?? null,
      changed_by: "system",
      reason: currentRankId === null ? "Initial rank assignment" : "Auto upgrade",
    });

  if (historyError) {
    console.error("[computeRank] Failed to record history:", historyError);
  }

  return { rankId: newRank?.id ?? null, changed: true };
}

export async function computeRankStats(userId: string): Promise<RankResponse> {
  const cacheKey = `${CACHE_VERSION}:user-rank:${userId}`;
  const cached = await getCache<RankResponse>(cacheKey);
  if (cached) return cached;

  const result = await computeRankStatsUncached(userId);
  await setCache(cacheKey, result, 60);
  return result;
}

async function computeRankStatsUncached(userId: string): Promise<RankResponse> {
  const [allRanks, stats] = await Promise.all([
    getAllRanks(),
    getUserOrderStats(userId),
  ]);

  if (allRanks.length === 0) {
    return {
      currentRank: null,
      nextRank: null,
      progress: { totalSpent: stats.totalSpent, orderCount: stats.orderCount, nextSpentThreshold: null, nextOrderThreshold: null },
      allRanks: [],
    };
  }

  const supabase = getPublicClient();
  const { data: user } = await supabase
    .from("users")
    .select("rank_id")
    .eq("id", userId)
    .maybeSingle();

  const currentRankId = user?.rank_id ?? null;

  // Determine current rank from DB or compute
  let currentRank: CustomerRank | null = null;
  let nextRank: CustomerRank | null = null;

  if (currentRankId) {
    currentRank = allRanks.find((r) => r.id === currentRankId) ?? null;
  }

  // If no rank in DB (new user), find the one they qualify for
  if (!currentRank) {
    for (const rank of allRanks) {
      if (stats.totalSpent >= rank.minTotalSpent && stats.orderCount >= rank.minOrderCount) {
        currentRank = rank;
      } else {
        break;
      }
    }
    if (!currentRank) {
      currentRank = allRanks[0];
    }
  }

  // Find next rank
  const currentIndex = allRanks.findIndex((r) => r.id === currentRank?.id);
  if (currentIndex >= 0 && currentIndex < allRanks.length - 1) {
    nextRank = allRanks[currentIndex + 1];
  }

  const progress: RankProgress = {
    totalSpent: stats.totalSpent,
    orderCount: stats.orderCount,
    nextSpentThreshold: nextRank ? nextRank.minTotalSpent : null,
    nextOrderThreshold: nextRank ? nextRank.minOrderCount : null,
  };

  return {
    currentRank,
    nextRank,
    progress,
    allRanks,
  };
}
