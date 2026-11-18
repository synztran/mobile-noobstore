import { getAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
	const body = await req.json();
	const supabase = getAdminClient();

	const payload = {
		name: body.name,
		code: body.code,
		description: body.description ?? null,
		reward_type: body.reward_type,
		scope_type: body.scope_type ?? "order_total",
		amount_off: body.amount_off ?? null,
		percent_off: body.percent_off ?? null,
		usage_limit_total: body.usage_limit_total ?? null,
		usage_limit_per_user: body.usage_limit_per_user ?? null,
		status: body.status ?? "draft",
		min_order_amount: body.min_order_amount ?? 0,
		start_at: body.start_at ?? null,
		end_at: body.end_at ?? null,
		stackable: Boolean(body.stackable),
		auto_apply: Boolean(body.auto_apply),
		applies_to_product_ids: body.applies_to_product_ids ?? null,
		applies_to_category_slugs: body.applies_to_category_slugs ?? null,
		excluded_product_ids: body.excluded_product_ids ?? null,
		applies_to_shipping_methods: body.applies_to_shipping_methods ?? null,
		customer_ids: body.customer_ids ?? null,
	};

	const { error } = await supabase.from("vouchers").insert(payload);

	if (error) {
		return NextResponse.json({ error: error.message }, { status: 400 });
	}

	return NextResponse.json({ success: true }, { status: 201 });
}
