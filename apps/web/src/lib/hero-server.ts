import type { HeroCampaign } from "@/app/api/home/hero/route";
import { getCache, setCache } from "@/lib/redis/cache";
import { createClient } from "@/lib/supabase/server";
import "server-only";

export async function getHeroCampaigns(): Promise<HeroCampaign[]> {
	const cacheKey = "home:hero";
	const cached = await getCache<HeroCampaign[]>(cacheKey);
	if (cached) return cached;

	const supabase = await createClient();
	const { data: campaigns, error } = await supabase
		.from("hero_campaigns")
		.select(
			"id, title, subtitle, description, image_url, cta_text, cta_link, is_active, priority",
		)
		.eq("is_active", true)
		.order("priority", { ascending: false })
		.limit(6);

	if (error || !campaigns || campaigns.length === 0) return [];

	await setCache(cacheKey, campaigns);
	return campaigns as unknown as HeroCampaign[];
}
