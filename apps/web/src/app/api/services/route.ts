import { getPublicClient } from "@/lib/supabase/public";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// ─── GET /api/services ────────────────────────────────────────────────────────
// Returns all available services with their base prices.

export async function GET() {
	const supabase = getPublicClient();

	const { data, error } = await supabase
		.from("services")
		.select("id, name, base_price");

	if (error) {
		return NextResponse.json({ error: error.message }, { status: 500 });
	}

	return NextResponse.json(data ?? []);
}
