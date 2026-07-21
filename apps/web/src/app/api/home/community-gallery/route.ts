import { createClient } from "@/lib/supabase/server";
import { getCache, setCache } from "@/lib/redis/cache";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export interface CommunityPhoto {
	id: string;
	image_url: string;
	alt_text: string;
	author: string;
	build_info: Record<string, string> | null;
	order: number;
}

export async function GET(request: Request) {
	try {
		const { searchParams } = new URL(request.url);
		const limit = Math.min(Number(searchParams.get("limit") ?? 6), 50);
		const offset = Number(searchParams.get("offset") ?? 0);

		const cacheKey = `community-gallery:${limit}:${offset}`;
		const cached = await getCache<CommunityPhoto[]>(cacheKey);
		if (cached) return NextResponse.json(cached, {
			headers: {
				"Cache-Control":
					"public, s-maxage=60, stale-while-revalidate=300",
			},
		});

		const supabase = await createClient();

		const { data: photos, error } = await supabase
			.from("community_gallery")
			.select("id, image_url, alt_text, author, build_info, order")
			.order("order", { ascending: true })
			.range(offset, offset + limit - 1);

		if (error) {
			return NextResponse.json(
				{ error: "Failed to fetch community photos" },
				{ status: 500 },
			);
		}

		const result = photos as CommunityPhoto[];
		await setCache(cacheKey, result, 60);

		return NextResponse.json(result, {
			headers: {
				"Cache-Control":
					"public, s-maxage=60, stale-while-revalidate=300",
			},
		});
	} catch (err) {
		console.error("[community gallery] error:", err);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
