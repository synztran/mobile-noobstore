import { getAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
	const supabase = getAdminClient();

	const { data, error } = await supabase
		.from("carriers")
		.select("id, name, logo, tracking_url_template, is_active, sort_order")
		.eq("is_active", true)
		.order("sort_order", { ascending: true });

	if (error) {
		return NextResponse.json({ error: error.message }, { status: 500 });
	}

	return NextResponse.json({ carriers: data ?? [] });
}