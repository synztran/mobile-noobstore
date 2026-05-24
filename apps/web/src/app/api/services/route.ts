import { getPublicClient } from "@/lib/supabase/public";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export interface ServiceOptionValue {
	id: number;
	label: string;
	price_adjustment: number;
	display_order: number;
}

export interface ServiceOption {
	id: number;
	label: string;
	is_required: boolean;
	display_order: number;
	values: ServiceOptionValue[];
}

export interface Service {
	id: string;
	name: string;
	slug: string | null;
	description: string | null;
	service_type: string;
	base_price: number;
	thumbnail_url: string | null;
	estimated_days: number | null;
	options: ServiceOption[];
}

// ─── GET /api/services ────────────────────────────────────────────────────────
// Returns all active services with their options and selectable values.

export async function GET() {
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
		.eq("is_active", true)
		.order("name");

	if (error) {
		return NextResponse.json({ error: error.message }, { status: 500 });
	}

	const services: Service[] = (data ?? []).map((svc) => ({
		id: svc.id,
		name: svc.name,
		slug: svc.slug,
		description: svc.description,
		service_type: svc.service_type,
		base_price: svc.base_price,
		thumbnail_url: svc.thumbnail_url,
		estimated_days: svc.estimated_days,
		options: (svc.service_options ?? [])
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
	}));

	return NextResponse.json(services);
}
