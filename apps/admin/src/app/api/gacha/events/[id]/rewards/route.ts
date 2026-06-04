import { getAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	const supabase = getAdminClient();

	const { data, error } = await supabase
		.from("gacha_rewards")
		.select("*")
		.eq("event_id", id)
		.order("weight", { ascending: false });

	if (error) return NextResponse.json({ error: error.message }, { status: 500 });
	return NextResponse.json(data);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	const body = await req.json();
	const supabase = getAdminClient();

	const { data, error } = await supabase
		.from("gacha_rewards")
		.insert({ ...body, event_id: id })
		.select()
		.single();

	if (error) return NextResponse.json({ error: error.message }, { status: 500 });
	return NextResponse.json(data, { status: 201 });
}
