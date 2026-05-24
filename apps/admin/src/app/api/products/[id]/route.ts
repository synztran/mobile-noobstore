import { getAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type RouteContext = {
	params: Promise<{ id: string }>;
};

export async function PATCH(req: NextRequest, context: RouteContext) {
	const { id } = await context.params;
	const body = await req.json();
	const supabase = getAdminClient();

	const { error } = await supabase.from("products").update(body).eq("id", id);

	if (error) {
		return NextResponse.json({ error: error.message }, { status: 400 });
	}

	return NextResponse.json({ success: true }, { status: 200 });
}
