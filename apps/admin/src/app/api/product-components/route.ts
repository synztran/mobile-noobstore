import { getAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
	const body = await req.json();
	const supabase = getAdminClient();
	const payload = {
		id: crypto.randomUUID(),
		parent_product_id: body.parent_product_id,
		component_product_id: body.component_product_id,
		component_group: body.component_group,
		is_required: body.is_required,
		max_quantity: body.max_quantity,
	};

	const { error } = await supabase.from("product_components").insert(payload);
	if (error) {
		return NextResponse.json({ error: error.message }, { status: 400 });
	}

	return NextResponse.json({ success: true }, { status: 201 });
}
