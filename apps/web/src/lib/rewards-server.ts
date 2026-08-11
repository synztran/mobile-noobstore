import { getPublicClient } from "@/lib/supabase/public";
import type { RewardItem, RewardsResponse } from "@/types/reward";

export async function getRewards(
	offset: number,
	limit: number,
): Promise<RewardsResponse> {
	const supabase = getPublicClient();

	const { data: rows, error, count } = await (supabase as any)
		.from("reward_items")
		.select("*", { count: "exact" })
		.eq("is_active", true)
		.order("points_cost", { ascending: true })
		.range(offset, offset + limit - 1);

	if (error) {
		throw new Error("Failed to fetch rewards");
	}

	const rewards: RewardItem[] = (rows ?? []).map(
		(r: Record<string, unknown>) => ({
			id: r.id as string,
			name: r.name as string,
			description: (r.description as string) ?? null,
			rewardType: r.reward_type as "voucher" | "product" | "point",
			pointsCost: r.points_cost as number,
			imageUrl: (r.image_url as string) ?? null,
			stock: (r.stock as number) ?? null,
			claimedCount: (r.claimed_count as number) ?? 0,
			metadata: (r.metadata as Record<string, unknown>) ?? {},
		}),
	);

	const total = count ?? rewards.length;
	const hasMore = offset + limit < total;

	return { rewards, total, hasMore };
}