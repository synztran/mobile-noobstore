import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export interface CommunityPhoto {
	id: string;
	image_url: string;
	alt_text: string;
	order: number;
}

export async function GET() {
	try {
		const supabase = await createClient();

		const { data: photos, error } = await supabase
			.from("community_gallery")
			.select("id, image_url, alt_text, order")
			.order("order", { ascending: true })
			.limit(3);

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
