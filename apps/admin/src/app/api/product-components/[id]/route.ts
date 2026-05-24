import { getAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function PATCH(
	req: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { id } = await params;
	const body = await req.json();
	const supabase = getAdminClient();

	const { error } = await supabase
		.from("product_components")
		.update({
			parent_product_id: body.parent_product_id,
			component_product_id: body.component_product_id,
			component_group: body.component_group,
			is_required: body.is_required,
			max_quantity: body.max_quantity,
		})
		.eq("id", id);

	if (error) {
		return NextResponse.json({ error: error.message }, { status: 400 });
	}

	return NextResponse.json({ success: true }, { status: 200 });
}
