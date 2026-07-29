import { getCache, setCache, CACHE_VERSION } from "@/lib/redis/cache";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export interface TrustProp {
	id: string;
	heading: string;
	body: string;
	icon: string;
	order: number;
}

export async function GET() {
	try {
		const cacheKey = `${CACHE_VERSION}:trust-props`;
		const cached = await getCache<TrustProp[]>(cacheKey);
		if (cached) return NextResponse.json(cached);

		const supabase = await createClient();

		const { data: props, error } = await supabase
			.from("trust_props")
			.select("id, heading, body, icon, order")
			.order("order", { ascending: true });

		if (error) {
			return NextResponse.json(
				{ error: "Failed to fetch trust props" },
				{ status: 500 },
			);
		}

		await setCache(cacheKey, props);
		return NextResponse.json(props as TrustProp[], {
			headers: {
				"Cache-Control":
					"public, s-maxage=60, stale-while-revalidate=300",
			},
		});
	} catch (err) {
		console.error("[trust props] error:", err);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
