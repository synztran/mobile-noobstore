import { logAuditEvent } from "@/lib/audit-log";
import { getAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isDuplicateSiblingLabel } from "@/lib/service-labels";
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

// POST /api/service-option-values
// Create a new value under a service option.
export async function POST(req: NextRequest) {
	const denied = await authorize();
	if (denied) return denied;
	const supabase = getAdminClient();

	const body = (await req.json().catch(() => null)) as {
		option_id?: number;
		label?: unknown;
		price_adjustment?: unknown;
		display_order?: unknown;
	} | null;

	const optionId = Number(body?.option_id);
	const label =
		typeof body?.label === "string" ? body.label.trim() : "";

	if (!Number.isFinite(optionId)) {
		return NextResponse.json(
			{ error: "option_id is required" },
			{ status: 400 },
		);
	}
	if (!label) {
		return NextResponse.json({ error: "label is required" }, { status: 400 });
	}
	if (body?.display_order !== undefined && (!Number.isInteger(Number(body.display_order)) || Number(body.display_order) < 0)) {
		return NextResponse.json({ error: "display_order must be a non-negative integer" }, { status: 400 });
	}

	const { data: option } = await supabase
		.from("service_options")
		.select("id")
		.eq("id", optionId)
		.maybeSingle();
	if (!option) {
		return NextResponse.json({ error: "Option not found" }, { status: 404 });
	}

	const { data: siblingValues, error: siblingValuesError } = await supabase
		.from("service_option_values")
		.select("label")
		.eq("option_id", optionId);
	if (siblingValuesError) return NextResponse.json({ error: "Không thể kiểm tra giá trị hiện có." }, { status: 500 });
	if (isDuplicateSiblingLabel(label, siblingValues ?? [])) {
		return NextResponse.json({ error: "Tên giá trị đã tồn tại trong tuỳ chọn này." }, { status: 409 });
	}

	let priceAdjustment = 0;
	if (body?.price_adjustment !== undefined) {
		const num = Number(body.price_adjustment);
		if (!Number.isFinite(num)) {
			return NextResponse.json(
				{ error: "price_adjustment must be a number" },
				{ status: 400 },
			);
		}
		priceAdjustment = num;
	}

	let displayOrder = 0;
	if (body?.display_order !== undefined) {
		const num = Number(body.display_order);
		if (!Number.isInteger(num) || num < 0) {
			return NextResponse.json(
				{ error: "display_order must be a non-negative integer" },
				{ status: 400 },
			);
		}
		displayOrder = num;
	} else {
		const { data: last } = await supabase
			.from("service_option_values")
			.select("display_order")
			.eq("option_id", optionId)
			.order("display_order", { ascending: false })
			.limit(1)
			.maybeSingle();
		displayOrder = (last?.display_order ?? -1) + 1;
	}

	const insert = {
		option_id: optionId,
		label,
		price_adjustment: priceAdjustment,
		display_order: displayOrder,
	};

	const { data, error } = await supabase
		.from("service_option_values")
		.insert(insert)
		.select()
		.maybeSingle();

	if (error) {
		return NextResponse.json({ error: error.message }, { status: 500 });
	}

	void logAuditEvent(
		{
			action: "service_option_values.insert",
			entity_type: "service_option_values",
			entity_id: String(data?.id ?? ""),
			new_data: data ?? insert,
		},
		supabase,
	);

	return NextResponse.json(data);
}
