import {
	SERVICE_PAGE_CLEANING_SECTION_IMAGE,
	SERVICE_PAGE_KEYCAP_SECTION_IMAGE,
	SERVICE_PAGE_PCB_SECTION_IMAGE,
	SERVICE_PAGE_STABILIZER_SECTION_IMAGE,
	SERVICE_PAGE_SWITCH_SECTION_IMAGE,
} from "@/lib/images";
import { getPublicClient } from "@/lib/supabase/public";
import type { ServicePricingRule } from "@/types/service-pricing";

// ─── Public types (re-exported by the API routes for backwards compat) ───────

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
	hint: string;
	services: BookingService[];
	heroImageUrl: string;
}

export interface BookingConfigResponse {
	sections: BookingSection[];
	pricing: ServicePricingRule[];
	defaults: {
		min_pickup_lead_hours: number;
	};
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SECTION_ORDER: BookingSectionKey[] = [
	"switch",
	"stabilizer",
	"lubricant",
	"pcb",
	"cleaning",
	"keycap_stem",
];

const SECTION_TITLES: Record<BookingSectionKey, string> = {
	switch: "Dịch vụ Switch",
	stabilizer: "Dịch vụ Stabilizer",
	lubricant: "Dịch vụ Bôi trơn",
	pcb: "Dịch vụ PCB",
	cleaning: "Dịch vụ Vệ sinh",
	keycap_stem: "Dịch vụ Keycap",
};

const SECTION_HINTS: Record<BookingSectionKey, string> = {
	switch: "Lube, thay và hiệu chỉnh switch",
	stabilizer: "Cắt chân, bôi trơn và lắp đặt stabilizer",
	lubricant: "Bôi trơn switch theo loại dầu / grease",
	pcb: "Sửa chữa, hotswap và mod PCB",
	cleaning: "Vệ sinh và bảo dưỡng bàn phím",
	keycap_stem: "Thay stem, keycap và phụ kiện",
};

const SECTION_HERO_IMAGE: Record<BookingSectionKey, string> = {
	switch: SERVICE_PAGE_SWITCH_SECTION_IMAGE,
	stabilizer: SERVICE_PAGE_STABILIZER_SECTION_IMAGE,
	lubricant: "",
	pcb: SERVICE_PAGE_PCB_SECTION_IMAGE,
	cleaning: SERVICE_PAGE_CLEANING_SECTION_IMAGE,
	keycap_stem: SERVICE_PAGE_KEYCAP_SECTION_IMAGE,
};

// ─── Loaders (shared by API routes and the warm-up job) ───────────────────────

const SERVICE_COLUMNS = `
	id, name, slug, description, service_type, service_section,
	base_price, handling_days, thumbnail_url, estimated_days, max_entries,
	service_configs (
		id, base_price, handling_days, is_active
	),
	service_options (
		id, label, is_required, display_order,
		service_option_values (
			id, label, price_adjustment, display_order
		)
	)
`;

export async function getServicesList(): Promise<Service[]> {
	const supabase = getPublicClient();

	const { data, error } = await supabase
		.from("services")
		.select(
			`
			id, name, slug, description, service_type,
			base_price, thumbnail_url, estimated_days,
			service_configs (
				id, base_price, is_active
			),
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
		throw new Error(error.message);
	}

	return (data ?? []).map((svc) => {
		const configs = Array.isArray(svc.service_configs) ? svc.service_configs : svc.service_configs ? [svc.service_configs] : [];
		const config = configs.find(
			(c) => c.is_active,
		);
		return {
			id: svc.id,
			name: svc.name,
			slug: svc.slug,
			description: svc.description,
			service_type: svc.service_type,
			base_price: config?.base_price ?? svc.base_price,
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
		};
	});
}

export async function getServiceBySlug(
	slug: string,
): Promise<Service | null> {
	const supabase = getPublicClient();

	const { data, error } = await supabase
		.from("services")
		.select(
			`
			id, name, slug, description, service_type,
			base_price, thumbnail_url, estimated_days,
			service_configs (
				id, base_price, is_active
			),
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
		throw new Error(error.message);
	}

	if (!data) {
		return null;
	}

	const configs = Array.isArray(data.service_configs) ? data.service_configs : data.service_configs ? [data.service_configs] : [];
	const config = configs.find(
		(c) => c.is_active,
	);

	return {
		id: data.id,
		name: data.name,
		slug: data.slug,
		description: data.description,
		service_type: data.service_type,
		base_price: config?.base_price ?? data.base_price,
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
}

export async function getBookingConfigData(): Promise<BookingConfigResponse> {
	const supabase = getPublicClient();

	const { data, error } = await supabase
		.from("services")
		.select(SERVICE_COLUMNS)
		.eq("is_active", true)
		.eq("is_bookable_on_services_page", true)
		.neq("service_section", "middleman")
		.order("service_section")
		.order("name");

	if (error) {
		throw new Error(error.message);
	}

	const serviceRows = (data ?? []).filter(
		(svc): svc is typeof svc & { service_section: BookingSectionKey } =>
			svc.service_section !== null &&
			SECTION_ORDER.includes(svc.service_section as BookingSectionKey),
	);

	const services: BookingService[] = serviceRows.map((svc) => {
		const configs = Array.isArray(svc.service_configs) ? svc.service_configs : svc.service_configs ? [svc.service_configs] : [];
		const config = configs.find(
			(c) => c.is_active,
		);
		return {
			id: svc.id,
			name: svc.name,
			slug: svc.slug,
			description: svc.description,
			service_type: svc.service_type,
			service_section: svc.service_section,
			base_price: config?.base_price ?? svc.base_price,
			handling_days: config?.handling_days ?? svc.handling_days,
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
		};
	});

	// ── Fetch pricing rules ──────────────────────────────────────────────────
	const { data: pricingData, error: pricingError } = await supabase
		.from("service_pricing_rules")
		.select("*")
		.order("service_type")
		.order("sort_order");

	if (pricingError) {
		throw new Error(pricingError.message);
	}

	const sections: BookingSection[] = SECTION_ORDER.map((key) => ({
		key,
		title: SECTION_TITLES[key],
		hint: SECTION_HINTS[key],
		services: services.filter((svc) => svc.service_section === key),
		heroImageUrl: SECTION_HERO_IMAGE[key],
	})).filter((section) => section.services.length > 0);

	return {
		sections,
		pricing: pricingData ?? [],
		defaults: {
			min_pickup_lead_hours: 2,
		},
	};
}