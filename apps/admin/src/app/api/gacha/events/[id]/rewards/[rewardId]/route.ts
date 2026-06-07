import { getAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; rewardId: string }> }) {
	const { rewardId } = await params;
	const body = await req.json();
	const supabase = getAdminClient();

	const { data, error } = await supabase
		.from("gacha_rewards")
		.update(body)
		.eq("id", Number(rewardId))
		.select()
		.single();

	if (error) return NextResponse.json({ error: error.message }, { status: 500 });
	return NextResponse.json(data);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; rewardId: string }> }) {
	const { rewardId } = await params;
	const supabase = getAdminClient();

	const { error } = await supabase.from("gacha_rewards").delete().eq("id", Number(rewardId));
	if (error) return NextResponse.json({ error: error.message }, { status: 500 });
	return NextResponse.json({ success: true });
}
