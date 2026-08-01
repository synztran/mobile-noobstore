import { getAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
	const body = await req.json();
	const supabase = getAdminClient();

	if (!Array.isArray(body)) {
		return NextResponse.json(
			{ error: "Request body must be an array of component rows" },
			{ status: 400 },
		);
	}

	const rows = body.map((row) => ({
		id: crypto.randomUUID(),
		parent_product_id: row?.parent_product_id ?? null,
		component_product_id: row?.component_product_id ?? null,
		component_group: row?.component_group ?? "",
		is_required: row?.is_required ?? false,
		max_quantity: row?.max_quantity ?? null,
	}));

	if (rows.length === 0) {
		return NextResponse.json(
			{ error: "At least one component row is required" },
			{ status: 400 },
		);
	}

	const { error } = await supabase.from("product_components").insert(rows);
	if (error) {
		return NextResponse.json({ error: error.message }, { status: 400 });
	}

	return NextResponse.json({ success: true }, { status: 201 });
}
