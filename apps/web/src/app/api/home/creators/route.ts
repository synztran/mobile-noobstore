import { getCache, setCache, CACHE_KEYS } from "@/lib/redis/cache";
import { getPublicClient } from "@/lib/supabase/public";
import { NextResponse } from "next/server";

// Response is cached at the Next.js edge (60s) so repeat hits never run the
// handler (no middleware Redis hop, no route Redis get). Uses the stateless
// public client (no cookies) so the route stays cacheable. Redis is a second
// layer for the first edge miss.
export const revalidate = 60;

export interface Creator {
	id: string;
	name: string;
	role: string;
	image_url: string;
	social_handle: string;
	color_theme: string;
	bio: string | null;
}

export async function GET() {
	try {
		const cacheKey = CACHE_KEYS.creators;
		const cached = await getCache<Creator[]>(cacheKey);
		if (cached) return NextResponse.json(cached);

		const { data: creators, error } = await getPublicClient()
			.from("creators")
			.select(
				"id, name, role, image_url, social_handle, color_theme, bio",
			)
			.order("created_at", { ascending: false })
			.limit(4);

		if (error) {
			return NextResponse.json(
				{ error: "Failed to fetch creators" },
				{ status: 500 },
			);
		}

		await setCache(cacheKey, creators);
		return NextResponse.json(creators as Creator[]);
	} catch (err) {
		console.error("[creators] error:", err);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
