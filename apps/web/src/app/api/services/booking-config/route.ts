import {
	SERVICE_PAGE_CLEANING_SECTION_IMAGE,
	SERVICE_PAGE_KEYCAP_SECTION_IMAGE,
	SERVICE_PAGE_PCB_SECTION_IMAGE,
	SERVICE_PAGE_STABILIZER_SECTION_IMAGE,
	SERVICE_PAGE_SWITCH_SECTION_IMAGE,
} from "@/lib/images";
import { getPublicClient } from "@/lib/supabase/public";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export type BookingSectionKey =
	| "switch"
	| "stabilizer"
	| "lubricant"
	| "pcb"
	| "cleaning"
	| "keycap_stem";

export interface BookingOptionValue {
	id: number;
	label: string;
	price_adjustment: number;
	display_order: number;
}

export interface BookingOption {
	id: number;
	label: string;
	is_required: boolean;
	display_order: number;
	values: BookingOptionValue[];
}

export interface BookingService {
	id: string;
	name: string;
	slug: string | null;
	description: string | null;
	service_type: string;
	service_section: BookingSectionKey;
	base_price: number;
	handling_days: number;
	thumbnail_url: string | null;
	estimated_days: number | null;
	max_entries: number | null;
	options: BookingOption[];
}

export interface BookingSection {
	key: BookingSectionKey;
	title: string;
	services: BookingService[];
	heroImageUrl: string;
}

export interface BookingConfigResponse {
	sections: BookingSection[];
	defaults: {
		min_pickup_lead_hours: number;
	};
}

const SECTION_ORDER: BookingSectionKey[] = [
	"switch",
	"stabilizer",
	"lubricant",
	"pcb",
	"cleaning",
	"keycap_stem",
];

const SECTION_TITLES: Record<BookingSectionKey, string> = {
	switch: "Switch Services",
	stabilizer: "Stabilizer Services",
	lubricant: "Lubricant Services",
	pcb: "PCB Services",
	cleaning: "Cleaning Services",
	keycap_stem: "Keycap Services",
};

const SECTION_HERO_IMAGE: Record<BookingSectionKey, string> = {
	switch: SERVICE_PAGE_SWITCH_SECTION_IMAGE,
	stabilizer: SERVICE_PAGE_STABILIZER_SECTION_IMAGE,
	lubricant: "",
	pcb: SERVICE_PAGE_PCB_SECTION_IMAGE,
	cleaning: SERVICE_PAGE_CLEANING_SECTION_IMAGE,
	keycap_stem: SERVICE_PAGE_KEYCAP_SECTION_IMAGE,
};

// ─── GET /api/services/booking-config ───────────────────────────────────────
// Returns active services grouped by booking section for the unified form.

export async function GET() {
	const supabase = getPublicClient();

	const { data, error } = await supabase
		.from("services")
		.select(
			`
			id, name, slug, description, service_type, service_section,
			base_price, handling_days, thumbnail_url, estimated_days, max_entries,
			service_options (
				id, label, is_required, display_order,
				service_option_values (
					id, label, price_adjustment, display_order
				)
			)
		`,
		)
		.eq("is_active", true)
		.eq("is_bookable_on_services_page", true)
		.neq("service_section", "middleman")
		.order("service_section")
		.order("name");

	if (error) {
		return NextResponse.json({ error: error.message }, { status: 500 });
	}

	const serviceRows = (data ?? []).filter(
		(svc): svc is typeof svc & { service_section: BookingSectionKey } =>
			svc.service_section !== null &&
			SECTION_ORDER.includes(svc.service_section as BookingSectionKey),
	);

	const services: BookingService[] = serviceRows.map((svc) => ({
		id: svc.id,
		name: svc.name,
		slug: svc.slug,
		description: svc.description,
		service_type: svc.service_type,
		service_section: svc.service_section,
		base_price: svc.base_price,
		handling_days: svc.handling_days,
		thumbnail_url: svc.thumbnail_url,
		estimated_days: svc.estimated_days,
		max_entries: svc.max_entries ?? null,
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

	const sections: BookingSection[] = SECTION_ORDER.map((key) => ({
		key,
		title: SECTION_TITLES[key],
		services: services.filter((svc) => svc.service_section === key),
		heroImageUrl: SECTION_HERO_IMAGE[key], // Add your hero image URL logic here
	})).filter((section) => section.services.length > 0);

	const response: BookingConfigResponse = {
		sections,
		defaults: {
			min_pickup_lead_hours: 2,
		},
	};

	return NextResponse.json(response);
}
