import { getPublicClient } from "@/lib/supabase/public";
import { NextRequest, NextResponse } from "next/server";
import type { Service } from "../route";

export const dynamic = "force-dynamic";

// ─── GET /api/services/[slug] ─────────────────────────────────────────────────
// Returns a single active service with its options and selectable values.

export async function GET(
	_req: NextRequest,
	{ params }: { params: Promise<{ slug: string }> },
) {
	const { slug } = await params;

	const supabase = getPublicClient();

	const { data, error } = await supabase
		.from("services")
		.select(
			`
			id, name, slug, description, service_type,
			base_price, thumbnail_url, estimated_days,
			service_options (
				id, label, is_required, display_order,
				service_option_values (
					id, label, price_adjustment, display_order
				)
			)
		`,
		)
		.eq("slug", slug)
		.eq("is_active", true)
		.maybeSingle();

	if (error) {
		return NextResponse.json({ error: error.message }, { status: 500 });
	}

	if (!data) {
		return NextResponse.json(
			{ error: "Service not found" },
			{ status: 404 },
		);
	}

	const service: Service = {
		id: data.id,
		name: data.name,
		slug: data.slug,
		description: data.description,
		service_type: data.service_type,
		base_price: data.base_price,
		thumbnail_url: data.thumbnail_url,
		estimated_days: data.estimated_days,
		options: (data.service_options ?? [])
			.sort((a, b) => a.display_order - b.display_order)
			.map((opt) => ({
				id: opt.id,
				label: opt.label,
				is_required: opt.is_required,
				display_order: opt.display_order,
				values: (opt.service_option_values ?? []).sort(
					(a, b) => a.display_order - b.display_order,
				),
			})),
	};

	return NextResponse.json(service);
}
