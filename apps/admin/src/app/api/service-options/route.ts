import { logAuditEvent } from "@/lib/audit-log";
import { getAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// POST /api/service-options
// Create a new option for a service.
export async function POST(req: NextRequest) {
	const supabase = getAdminClient();

	const body = (await req.json().catch(() => null)) as {
		service_id?: string;
		label?: unknown;
		is_required?: boolean;
		display_order?: unknown;
	} | null;

	const serviceId = body?.service_id;
	const label =
		typeof body?.label === "string" ? body.label.trim() : "";

	if (!serviceId) {
		return NextResponse.json(
			{ error: "service_id is required" },
			{ status: 400 },
		);
	}
	if (!label) {
		return NextResponse.json(
			{ error: "label is required" },
			{ status: 400 },
		);
	}

	const { data: service } = await supabase
		.from("services")
		.select("id")
		.eq("id", serviceId)
		.maybeSingle();
	if (!service) {
		return NextResponse.json({ error: "Service not found" }, { status: 404 });
	}

	let displayOrder = 0;
	if (body?.display_order !== undefined) {
		const num = Number(body.display_order);
		if (!Number.isFinite(num)) {
			return NextResponse.json(
				{ error: "display_order must be a number" },
				{ status: 400 },
			);
		}
		displayOrder = Math.round(num);
	} else {
		const { data: last } = await supabase
			.from("service_options")
			.select("display_order")
			.eq("service_id", serviceId)
			.order("display_order", { ascending: false })
			.limit(1)
			.maybeSingle();
		displayOrder = (last?.display_order ?? -1) + 1;
	}

	const insert = {
		service_id: serviceId,
		label,
		is_required: Boolean(body?.is_required),
		display_order: displayOrder,
	};

	const { data, error } = await supabase
		.from("service_options")
		.insert(insert)
		.select()
		.maybeSingle();

	if (error) {
		return NextResponse.json({ error: error.message }, { status: 500 });
	}

	void logAuditEvent(
		{
			action: "service_options.insert",
			entity_type: "service_options",
			entity_id: String(data?.id ?? ""),
			new_data: data ?? insert,
		},
		supabase,
	);

	return NextResponse.json(data);
}
