import { getCache, setCache } from "@/lib/redis/cache";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

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
		const cacheKey = "home:creators";
		const cached = await getCache<Creator[]>(cacheKey);
		if (cached) return NextResponse.json(cached);

		const supabase = await createClient();

		const { data: creators, error } = await supabase
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

		await setCache(cacheKey, creators, 600);
		return NextResponse.json(creators as Creator[]);
	} catch (err) {
		console.error("[creators] error:", err);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
