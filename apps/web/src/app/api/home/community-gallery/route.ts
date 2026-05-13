import { createClient } from "@/lib/supabase/server";
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

		return NextResponse.json(photos as CommunityPhoto[]);
	} catch (err) {
		console.error("[community gallery] error:", err);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
