import { logAuditEvent } from "@/lib/audit-log";
import { getAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
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

// GET /api/service-configs
// List every service config joined with its service row (name, section, and the
// catalog defaults) so the admin UI can show both effective and default values.
export async function GET() {
	const supabase = getAdminClient();

	const { data, error } = await supabase
		.from("service_configs")
		.select(
			`
			id,
			service_id,
			base_price,
			handling_days,
			is_active,
			updated_at,
			services(id, name, service_type, service_section, base_price, handling_days)
		`,
		)
		.order("service_id");

	if (error) {
		return NextResponse.json({ error: error.message }, { status: 500 });
	}

	return NextResponse.json(data ?? []);
}

// PUT /api/service-configs
// Upsert the price / handling-days config for a single service.
export async function PUT(req: NextRequest) {
	const denied = await authorize();
	if (denied) return denied;
	const supabase = getAdminClient();

	const body = (await req.json().catch(() => null)) as {
		service_id?: string;
		base_price?: unknown;
		handling_days?: unknown;
		is_active?: boolean;
	} | null;

	const serviceId = body?.service_id;
	if (!serviceId) {
		return NextResponse.json(
			{ error: "service_id is required" },
			{ status: 400 },
		);
	}

	const basePrice = Number(body?.base_price);
	const handlingDays = Number(body?.handling_days);
	if (body?.base_price === undefined || !Number.isFinite(basePrice) || basePrice < 0) {
		return NextResponse.json(
			{ error: "base_price must be a non-negative number" },
			{ status: 400 },
		);
	}
	if (
		body?.handling_days === undefined ||
		!Number.isFinite(handlingDays) ||
		handlingDays < 0
	) {
		return NextResponse.json(
			{ error: "handling_days must be a non-negative number" },
			{ status: 400 },
		);
	}
	if (body?.is_active !== undefined && typeof body.is_active !== "boolean") return NextResponse.json({ error: "is_active must be a boolean" }, { status: 400 });
	const isActive = body?.is_active !== false;

	const { data: service } = await supabase
		.from("services")
		.select("id")
		.eq("id", serviceId)
		.maybeSingle();
	if (!service) {
		return NextResponse.json({ error: "Service not found" }, { status: 404 });
	}

	const { data: oldConfig } = await supabase
		.from("service_configs")
		.select("base_price, handling_days, is_active")
		.eq("service_id", serviceId)
		.maybeSingle();

	const { error } = await supabase
		.from("service_configs")
		.upsert(
			{
				service_id: serviceId,
				base_price: basePrice,
				handling_days: handlingDays,
				is_active: isActive,
			},
			{ onConflict: "service_id" },
		);

	if (error) {
		return NextResponse.json({ error: error.message }, { status: 500 });
	}

	void logAuditEvent(
		{
			action: "service_configs.upsert",
			entity_type: "service_configs",
			entity_id: serviceId,
			old_data: oldConfig ?? undefined,
			new_data: {
				service_id: serviceId,
				base_price: basePrice,
				handling_days: handlingDays,
				is_active: isActive,
			},
		},
		supabase,
	);

	return NextResponse.json({ success: true });
}
