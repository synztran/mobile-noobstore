import { getAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; userId: string }> }) {
	const { id, userId } = await params;
	const supabase = getAdminClient();

	const { error } = await supabase
		.from("gacha_event_blocked_users")
		.delete()
		.eq("event_id", id)
		.eq("user_id", userId);

	if (error) return NextResponse.json({ error: error.message }, { status: 500 });
	return NextResponse.json({ success: true });
}
