import { logAuditEvent } from "@/lib/audit-log";
import { getAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@db-types";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type ServiceUpdate = Database["public"]["Tables"]["services"]["Update"];

type RouteContext = {
	params: Promise<{ id: string }>;
};

const SECTION_VALUES = [
	"repair",
	"switch",
	"stabilizer",
	"lubricant",
	"pcb",
	"cleaning",
	"keycap_stem",
] as const;

async function authorize() {
	const session = await createClient();
	const { data: { user }, error } = await session.auth.getUser();
	if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	const { data: profile } = await session.from("users").select("role").eq("id", user.id).maybeSingle();
	if (profile?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
	return null;
}

// PATCH /api/services/[id]
// Update service catalog info (name, description, pricing defaults, flags...).
export async function PATCH(req: NextRequest, context: RouteContext) {
	const denied = await authorize();
	if (denied) return denied;
	const { id } = await context.params;
	const supabase = getAdminClient();

	const body = (await req.json().catch(() => null)) as Record<
		string,
		unknown
	> | null;
	if (!body) {
		return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
	}

	const sanitized: ServiceUpdate = {};

	for (const field of ["slug", "description"] as const) {
		if (Object.prototype.hasOwnProperty.call(body, field)) {
			const value = body[field];
			sanitized[field] =
				typeof value === "string" && value.trim() !== ""
					? value.trim()
					: null;
		}
	}
	if (Object.prototype.hasOwnProperty.call(body, "slug") && sanitized.slug) {
		const { data: duplicate } = await supabase.from("services").select("id").eq("slug", sanitized.slug).neq("id", id).maybeSingle();
		if (duplicate) return NextResponse.json({ error: "Slug đã tồn tại. Hãy chọn slug khác." }, { status: 409 });
	}

	for (const field of ["name", "service_type"] as const) {
		if (Object.prototype.hasOwnProperty.call(body, field)) {
			const value = body[field];
			if (typeof value !== "string" || !value.trim()) {
				return NextResponse.json(
					{ error: `${field} must be a non-empty string` },
					{ status: 400 },
				);
			}
			sanitized[field] = value.trim();
		}
	}

	if (Object.prototype.hasOwnProperty.call(body, "service_section")) {
		const section = body.service_section;
		if (section === null || section === "") {
			sanitized.service_section = null;
		} else if (
			typeof section === "string" &&
			(SECTION_VALUES as readonly string[]).includes(section)
		) {
			sanitized.service_section = section;
		} else {
			return NextResponse.json(
				{ error: "service_section is not a valid section key" },
				{ status: 400 },
			);
		}
	}

	for (const field of ["base_price", "handling_days"] as const) {
		if (Object.prototype.hasOwnProperty.call(body, field)) {
			const num = Number(body[field]);
			if (!Number.isFinite(num) || num < 0) {
				return NextResponse.json(
					{ error: `${field} must be a non-negative number` },
					{ status: 400 },
				);
			}
			sanitized[field] = num;
		}
	}

	for (const field of ["estimated_days", "max_entries"] as const) {
		if (Object.prototype.hasOwnProperty.call(body, field)) {
			const raw = body[field];
			if (raw === null || raw === "") {
				sanitized[field] = null;
			} else {
				const num = Number(raw);
				if (!Number.isFinite(num) || num < 0) {
					return NextResponse.json(
						{ error: `${field} must be a non-negative number or null` },
						{ status: 400 },
					);
				}
				sanitized[field] = Math.round(num);
			}
		}
	}

	for (const field of [
		"is_active",
		"is_bookable_on_services_page",
	] as const) {
		if (Object.prototype.hasOwnProperty.call(body, field)) {
			if (typeof body[field] !== "boolean") return NextResponse.json({ error: `${field} must be a boolean` }, { status: 400 });
			sanitized[field] = body[field];
		}
	}

	if (Object.keys(sanitized).length === 0) {
		return NextResponse.json(
			{ error: "No valid fields to update" },
			{ status: 400 },
		);
	}

	const { data: existing } = await supabase
		.from("services")
		.select("*")
		.eq("id", id)
		.maybeSingle();
	if (!existing) {
		return NextResponse.json({ error: "Service not found" }, { status: 404 });
	}

	const { data: updated, error } = await supabase
		.from("services")
		.update(sanitized)
		.eq("id", id)
		.select()
		.maybeSingle();

	if (error) {
		return NextResponse.json({ error: error.code === "23505" ? "Slug đã tồn tại. Hãy chọn slug khác." : error.message }, { status: error.code === "23505" ? 409 : 500 });
	}

	void logAuditEvent(
		{
			action: "services.update",
			entity_type: "services",
			entity_id: id,
			old_data: existing,
			new_data: updated ?? sanitized,
		},
		supabase,
	);

	return NextResponse.json(updated);
}
