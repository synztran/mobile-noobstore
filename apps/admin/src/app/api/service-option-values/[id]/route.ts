import { logAuditEvent } from "@/lib/audit-log";
import { getAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@db-types";
import { isDuplicateSiblingLabel } from "@/lib/service-labels";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type ValueUpdate =
	Database["public"]["Tables"]["service_option_values"]["Update"];

type RouteContext = {
	params: Promise<{ id: string }>;
};

async function authorize() {
	const session = await createClient();
	const { data: { user }, error } = await session.auth.getUser();
	if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	const { data: profile } = await session.from("users").select("role").eq("id", user.id).maybeSingle();
	if (profile?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
	return null;
}

// PATCH /api/service-option-values/[id]
export async function PATCH(req: NextRequest, context: RouteContext) {
	const denied = await authorize();
	if (denied) return denied;
	const { id } = await context.params;
	const supabase = getAdminClient();

	const valueId = Number(id);
	if (!Number.isFinite(valueId)) {
		return NextResponse.json({ error: "Invalid value id" }, { status: 400 });
	}

	const body = (await req.json().catch(() => null)) as Record<
		string,
		unknown
	> | null;
	if (!body) {
		return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
	}

	const sanitized: ValueUpdate = {};

	if (Object.prototype.hasOwnProperty.call(body, "label")) {
		const label =
			typeof body.label === "string" ? body.label.trim() : "";
		if (!label) {
			return NextResponse.json(
				{ error: "label must be a non-empty string" },
				{ status: 400 },
			);
		}
		sanitized.label = label;
	}
	if (Object.prototype.hasOwnProperty.call(body, "price_adjustment")) {
		const num = Number(body.price_adjustment);
		if (!Number.isFinite(num)) {
			return NextResponse.json(
				{ error: "price_adjustment must be a number" },
				{ status: 400 },
			);
		}
		sanitized.price_adjustment = num;
	}
	if (Object.prototype.hasOwnProperty.call(body, "display_order")) {
		const num = Number(body.display_order);
		if (!Number.isInteger(num) || num < 0) {
			return NextResponse.json(
				{ error: "display_order must be a non-negative integer" },
				{ status: 400 },
			);
		}
		sanitized.display_order = num;
	}

	if (Object.keys(sanitized).length === 0) {
		return NextResponse.json(
			{ error: "No valid fields to update" },
			{ status: 400 },
		);
	}

	const { data: existing } = await supabase
		.from("service_option_values")
		.select("id, option_id, label")
		.eq("id", valueId)
		.maybeSingle();
	if (!existing) {
		return NextResponse.json(
			{ error: "Option value not found" },
			{ status: 404 },
		);
	}
	if (sanitized.label) {
		const { data: siblingValues, error: siblingValuesError } = await supabase
			.from("service_option_values")
			.select("id, label")
			.eq("option_id", existing.option_id);
		if (siblingValuesError) return NextResponse.json({ error: "Không thể kiểm tra giá trị hiện có." }, { status: 500 });
		if (isDuplicateSiblingLabel(sanitized.label, siblingValues ?? [], valueId)) {
			return NextResponse.json({ error: "Tên giá trị đã tồn tại trong tuỳ chọn này." }, { status: 409 });
		}
	}

	const { data, error } = await supabase
		.from("service_option_values")
		.update(sanitized)
		.eq("id", valueId)
		.select()
		.maybeSingle();

	if (error) {
		return NextResponse.json({ error: error.message }, { status: 500 });
	}

	void logAuditEvent(
		{
			action: "service_option_values.update",
			entity_type: "service_option_values",
			entity_id: String(valueId),
			old_data: existing,
			new_data: data ?? sanitized,
		},
		supabase,
	);

	return NextResponse.json(data);
}

// DELETE /api/service-option-values/[id]
export async function DELETE(_req: NextRequest, context: RouteContext) {
	const denied = await authorize();
	if (denied) return denied;
	const { id } = await context.params;
	const supabase = getAdminClient();

	const valueId = Number(id);
	if (!Number.isFinite(valueId)) {
		return NextResponse.json({ error: "Invalid value id" }, { status: 400 });
	}

	const { data: existing } = await supabase
		.from("service_option_values")
		.select("*")
		.eq("id", valueId)
		.maybeSingle();
	if (!existing) {
		return NextResponse.json(
			{ error: "Option value not found" },
			{ status: 404 },
		);
	}

	const { error } = await supabase
		.from("service_option_values")
		.delete()
		.eq("id", valueId);

	if (error) {
		return NextResponse.json({ error: error.message }, { status: 500 });
	}

	void logAuditEvent(
		{
			action: "service_option_values.delete",
			entity_type: "service_option_values",
			entity_id: String(valueId),
			old_data: existing,
		},
		supabase,
	);

	return NextResponse.json({ success: true });
}
