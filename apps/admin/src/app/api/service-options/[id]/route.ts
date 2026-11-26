import { logAuditEvent } from "@/lib/audit-log";
import { getAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@db-types";
import { isDuplicateSiblingLabel } from "@/lib/service-labels";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type OptionUpdate = Database["public"]["Tables"]["service_options"]["Update"];

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

// PATCH /api/service-options/[id]
export async function PATCH(req: NextRequest, context: RouteContext) {
	const denied = await authorize();
	if (denied) return denied;
	const { id } = await context.params;
	const supabase = getAdminClient();

	const optionId = Number(id);
	if (!Number.isFinite(optionId)) {
		return NextResponse.json({ error: "Invalid option id" }, { status: 400 });
	}

	const body = (await req.json().catch(() => null)) as Record<
		string,
		unknown
	> | null;
	if (!body) {
		return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
	}

	const sanitized: OptionUpdate = {};

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
	if (Object.prototype.hasOwnProperty.call(body, "is_required")) {
		if (typeof body.is_required !== "boolean") return NextResponse.json({ error: "is_required must be a boolean" }, { status: 400 });
		sanitized.is_required = body.is_required;
	}
	if (Object.prototype.hasOwnProperty.call(body, "display_order")) {
		const num = Number(body.display_order);
		if (!Number.isInteger(num) || num < 0) {
			return NextResponse.json(
				{ error: "display_order must be a non-negative integer" },
				{ status: 400 },
			);
		}
		sanitized.display_order = Math.round(num);
	}

	if (Object.keys(sanitized).length === 0) {
		return NextResponse.json(
			{ error: "No valid fields to update" },
			{ status: 400 },
		);
	}

	const { data: existing } = await supabase
		.from("service_options")
		.select("id, service_id, label")
		.eq("id", optionId)
		.maybeSingle();
	if (!existing) {
		return NextResponse.json({ error: "Option not found" }, { status: 404 });
	}
	if (sanitized.label) {
		const { data: siblingOptions, error: siblingOptionsError } = await supabase
			.from("service_options")
			.select("id, label")
			.eq("service_id", existing.service_id);
		if (siblingOptionsError) return NextResponse.json({ error: "Không thể kiểm tra tuỳ chọn hiện có." }, { status: 500 });
		if (isDuplicateSiblingLabel(sanitized.label, siblingOptions ?? [], optionId)) {
			return NextResponse.json({ error: "Tên tuỳ chọn đã tồn tại trong dịch vụ này." }, { status: 409 });
		}
	}

	const { data, error } = await supabase
		.from("service_options")
		.update(sanitized)
		.eq("id", optionId)
		.select()
		.maybeSingle();

	if (error) {
		return NextResponse.json({ error: error.message }, { status: 500 });
	}

	void logAuditEvent(
		{
			action: "service_options.update",
			entity_type: "service_options",
			entity_id: String(optionId),
			old_data: existing,
			new_data: data ?? sanitized,
		},
		supabase,
	);

	return NextResponse.json(data);
}

// DELETE /api/service-options/[id]
// Deletes the option; its values cascade via FK.
export async function DELETE(_req: NextRequest, context: RouteContext) {
	const denied = await authorize();
	if (denied) return denied;
	const { id } = await context.params;
	const supabase = getAdminClient();

	const optionId = Number(id);
	if (!Number.isFinite(optionId)) {
		return NextResponse.json({ error: "Invalid option id" }, { status: 400 });
	}

	const { data: existing } = await supabase
		.from("service_options")
		.select("*")
		.eq("id", optionId)
		.maybeSingle();
	if (!existing) {
		return NextResponse.json({ error: "Option not found" }, { status: 404 });
	}

	const { error } = await supabase
		.from("service_options")
		.delete()
		.eq("id", optionId);

	if (error) {
		return NextResponse.json({ error: error.message }, { status: 500 });
	}

	void logAuditEvent(
		{
			action: "service_options.delete",
			entity_type: "service_options",
			entity_id: String(optionId),
			old_data: existing,
		},
		supabase,
	);

	return NextResponse.json({ success: true });
}
