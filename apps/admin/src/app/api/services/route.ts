import { createClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { logAuditEvent } from "@/lib/audit-log";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

async function authorize() {
	const session = await createClient();
	const { data: { user }, error } = await session.auth.getUser();
	if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	const { data: profile } = await session.from("users").select("role").eq("id", user.id).maybeSingle();
	if (profile?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
	return null;
}

export async function POST(req: NextRequest) {
	const denied = await authorize();
	if (denied) return denied;
	const body = await req.json().catch(() => null) as Record<string, unknown> | null;
	if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
	const name = typeof body.name === "string" ? body.name.trim() : "";
	const slug = typeof body.slug === "string" ? body.slug.trim() : "";
	const serviceType = typeof body.service_type === "string" ? body.service_type.trim() : "";
	if (!name || !slug || !serviceType) return NextResponse.json({ error: "name, slug and service_type are required" }, { status: 400 });
	for (const field of ["base_price", "handling_days"] as const) {
		const value = Number(body[field]);
		if (!Number.isFinite(value) || value < 0) return NextResponse.json({ error: `${field} must be a non-negative number` }, { status: 400 });
	}
	if (body.estimated_days != null && body.estimated_days !== "" && (!Number.isFinite(Number(body.estimated_days)) || Number(body.estimated_days) < 0)) return NextResponse.json({ error: "estimated_days must be a non-negative number or null" }, { status: 400 });
	if (body.max_entries != null && body.max_entries !== "" && (!Number.isInteger(Number(body.max_entries)) || Number(body.max_entries) < 0)) return NextResponse.json({ error: "max_entries must be a non-negative integer or null" }, { status: 400 });
	const supabase = getAdminClient();
	const { data: duplicate } = await supabase.from("services").select("id").eq("slug", slug).maybeSingle();
	if (duplicate) return NextResponse.json({ error: "Slug đã tồn tại. Hãy chọn slug khác." }, { status: 409 });
	const insert = {
		name, slug, service_type: serviceType,
		description: typeof body.description === "string" && body.description.trim() ? body.description.trim() : null,
		service_section: typeof body.service_section === "string" && body.service_section ? body.service_section : null,
		base_price: Number(body.base_price), handling_days: Number(body.handling_days),
		estimated_days: body.estimated_days == null || body.estimated_days === "" ? null : Math.round(Number(body.estimated_days)),
		max_entries: body.max_entries == null || body.max_entries === "" ? null : Math.round(Number(body.max_entries)),
		is_active: body.is_active !== false,
		is_bookable_on_services_page: body.is_bookable_on_services_page === true,
	};
	const { data, error } = await supabase.from("services").insert(insert as never).select().maybeSingle();
	if (error) return NextResponse.json({ error: error.code === "23505" ? "Slug đã tồn tại. Hãy chọn slug khác." : error.message }, { status: error.code === "23505" ? 409 : 500 });
	void logAuditEvent({ action: "services.insert", entity_type: "services", entity_id: data?.id ?? "", new_data: data ?? insert }, supabase);
	return NextResponse.json(data, { status: 201 });
}
