import { getAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(
	_req: NextRequest,
	{ params }: { params: Promise<{ id: string; missionId: string }> }
) {
	const { missionId } = await params;
	const supabase = getAdminClient();

	const { data: progress, error } = await supabase
		.from("user_mission_progress")
		.select("*")
		.eq("mission_id", missionId)
		.order("id", { ascending: false });

	if (error) return NextResponse.json({ error: error.message }, { status: 500 });

	// Fetch user details
	const userIds = (progress ?? []).map((p) => p.user_id);
	let usersMap: Record<string, { email: string; full_name: string | null }> = {};

	if (userIds.length > 0) {
		const { data: users } = await supabase
			.from("users")
			.select("id, email, first_name, last_name")
			.in("id", userIds);

		if (users) {
			usersMap = Object.fromEntries(
				users.map((u) => [
					u.id,
					{
						email: u.email,
						full_name: [u.first_name, u.last_name].filter(Boolean).join(" ") || null,
					},
				])
			);
		}
	}

	const result = (progress ?? []).map((p) => ({
		...p,
		user: usersMap[p.user_id] ?? null,
	}));

	return NextResponse.json(result);
}
