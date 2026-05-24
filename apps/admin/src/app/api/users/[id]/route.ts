import { getAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type RouteContext = {
	params: Promise<{ id: string }>;
};

export async function PATCH(req: NextRequest, context: RouteContext) {
	const { id } = await context.params;
	const body = await req.json();

	const updates = {
		first_name:
			typeof body.first_name === "string" || body.first_name === null
				? body.first_name
				: undefined,
		last_name:
			typeof body.last_name === "string" || body.last_name === null
				? body.last_name
				: undefined,
		phone_number:
			typeof body.phone_number === "string" || body.phone_number === null
				? body.phone_number
				: undefined,
		role:
			typeof body.role === "string" && body.role.trim().length > 0
				? body.role
				: undefined,
	};

	const payload = Object.fromEntries(
		Object.entries(updates).filter(([, value]) => value !== undefined),
	);

	if (Object.keys(payload).length === 0) {
		return NextResponse.json(
			{ error: "No valid fields to update" },
			{ status: 400 },
		);
	}

	const supabase = getAdminClient();
	const { error } = await supabase.from("users").update(payload).eq("id", id);

	if (error) {
		return NextResponse.json({ error: error.message }, { status: 400 });
	}

	return NextResponse.json({ success: true }, { status: 200 });
}
