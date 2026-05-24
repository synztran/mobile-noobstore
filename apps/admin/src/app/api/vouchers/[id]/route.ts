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

	const sanitized: Record<string, unknown> = {};

	if (Object.prototype.hasOwnProperty.call(body, "name")) {
		sanitized.name = body.name;
	}
	if (Object.prototype.hasOwnProperty.call(body, "code")) {
		sanitized.code = body.code;
	}
	if (Object.prototype.hasOwnProperty.call(body, "description")) {
		sanitized.description = body.description;
	}
	if (Object.prototype.hasOwnProperty.call(body, "reward_type")) {
		sanitized.reward_type = body.reward_type;
	}
	if (Object.prototype.hasOwnProperty.call(body, "scope_type")) {
		sanitized.scope_type = body.scope_type;
	}
	if (Object.prototype.hasOwnProperty.call(body, "amount_off")) {
		sanitized.amount_off = body.amount_off;
	}
	if (Object.prototype.hasOwnProperty.call(body, "percent_off")) {
		sanitized.percent_off = body.percent_off;
	}
	if (Object.prototype.hasOwnProperty.call(body, "usage_limit_total")) {
		sanitized.usage_limit_total = body.usage_limit_total;
	}
	if (Object.prototype.hasOwnProperty.call(body, "usage_limit_per_user")) {
		sanitized.usage_limit_per_user = body.usage_limit_per_user;
	}
	if (Object.prototype.hasOwnProperty.call(body, "status")) {
		sanitized.status = body.status;
	}
	if (Object.prototype.hasOwnProperty.call(body, "min_order_amount")) {
		sanitized.min_order_amount = body.min_order_amount;
	}
	if (Object.prototype.hasOwnProperty.call(body, "start_at")) {
		sanitized.start_at = body.start_at;
	}
	if (Object.prototype.hasOwnProperty.call(body, "end_at")) {
		sanitized.end_at = body.end_at;
	}
	if (Object.prototype.hasOwnProperty.call(body, "stackable")) {
		sanitized.stackable = body.stackable;
	}

	if (Object.keys(sanitized).length === 0) {
		return NextResponse.json(
			{ error: "No valid fields to update" },
			{ status: 400 },
		);
	}

	const { error } = await supabase
		.from("vouchers")
		.update(sanitized)
		.eq("id", id);

	if (error) {
		return NextResponse.json({ error: error.message }, { status: 400 });
	}

	return NextResponse.json({ success: true }, { status: 200 });
}
