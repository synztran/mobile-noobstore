import { getAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
	const supabase = getAdminClient();
	const { data, error } = await supabase
		.from("gacha_events")
		.select("*")
		.order("created_at", { ascending: false });

	if (error) return NextResponse.json({ error: error.message }, { status: 500 });
	return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
	const body = await req.json();
	const supabase = getAdminClient();

	const { data, error } = await supabase
		.from("gacha_events")
		.insert(body)
		.select()
		.single();

	if (error) return NextResponse.json({ error: error.message }, { status: 500 });
	return NextResponse.json(data, { status: 201 });
}
