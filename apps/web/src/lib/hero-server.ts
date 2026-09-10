import type { HeroCampaign } from "@/app/api/home/hero/route";
import { getPublicClient } from "@/lib/supabase/public";
import "server-only";

/**
 * Hero campaigns for the home page server render.
 *
 * NOTE: deliberately no Redis here. The home page is ISR (`revalidate = 300`),
 * so Next caches the rendered output across requests — a Redis hop inside the
 * render would issue a `no-store` fetch (Upstash SDK default) during ISR
 * background revalidation and trip Next's "static to dynamic at runtime"
 * error (see Vercel observability logs for `/`). The client-side refetch path
 * (`/api/home/hero`) keeps its own Redis cache.
 */
export async function getHeroCampaigns(): Promise<HeroCampaign[]> {
	const supabase = getPublicClient();
	const { data: campaigns, error } = await supabase
		.from("hero_campaigns")
		.select(
			"id, title, subtitle, description, image_url, cta_text, cta_link, is_active, priority",
		)
		.eq("is_active", true)
		.order("priority", { ascending: false })
		.limit(6);

	if (error || !campaigns || campaigns.length === 0) return [];

	return campaigns as unknown as HeroCampaign[];
}
