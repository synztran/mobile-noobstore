import { getAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
	const supabase = getAdminClient();
	const { data, error } = await supabase
		.from("order_status")
		.select("status, description")
		.order("status");

	if (error) {
		return NextResponse.json({ error: error.message }, { status: 500 });
	}
	return NextResponse.json(data);
}
