import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export interface HeroCampaign {
	id: string;
	title: string;
	subtitle: string;
	description: string;
	image_url: string;
	cta_text: string;
	cta_link: string;
	is_active: boolean;
}

export async function GET() {
	try {
		const supabase = await createClient();

		const { data: campaigns, error } = await supabase
			.from("hero_campaigns")
			.select(
				"id, title, subtitle, description, image_url, cta_text, cta_link, is_active",
			)
			.eq("is_active", true)
			.order("created_at", { ascending: true })
			.limit(6);

		if (error) {
			console.error("[hero] query error:", error);
			return NextResponse.json(
				{ error: "Failed to fetch campaign" },
				{ status: 500 },
			);
		}

		if (!campaigns || campaigns.length === 0) {
			return NextResponse.json(
				{ error: "No active campaign found" },
				{ status: 404 },
			);
		}

		return NextResponse.json(campaigns as HeroCampaign[]);
	} catch (err) {
		console.error("[hero] error:", err);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
