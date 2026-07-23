import { getCache, setCache } from "@/lib/redis/cache";
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
		const cacheKey = "home:trust-props";
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

		await setCache(cacheKey, props, 600);
		return NextResponse.json(props as TrustProp[]);
	} catch (err) {
		console.error("[trust props] error:", err);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
