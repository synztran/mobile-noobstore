import { getAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type RouteContext = {
	params: Promise<{ id: string }>;
};

const KIT_SELECT = `
	id, name, slug, product_type, base_price, stock_quantity,
	product_variants(id, variant_name, stock_quantity, price_adjustment),
	product_components!product_components_parent_product_id_fkey(
		id, component_group, is_required, component_product_id,
		products!product_components_component_product_id_fkey(
			id, name, slug,
			product_variants(id, variant_name, stock_quantity, price_adjustment)
		)
	)
`;

export async function GET(_req: NextRequest, context: RouteContext) {
	const { id } = await context.params;
	const supabase = getAdminClient();

	const { data, error } = await supabase
		.from("products")
		.select(KIT_SELECT)
		.eq("id", id)
		.single();

	if (error) {
		return NextResponse.json({ error: error.message }, { status: 404 });
	}
	return NextResponse.json(data);
}

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
