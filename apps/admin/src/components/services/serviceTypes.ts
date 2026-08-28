export interface AdminOptionValue {
	id: number;
	label: string;
	price_adjustment: number;
	display_order: number;
}

export interface AdminServiceOption {
	id: number;
	service_id?: string;
	label: string;
	is_required: boolean;
	display_order: number;
	service_option_values?: AdminOptionValue[] | null;
}

export interface AdminServiceConfig {
	id: string;
	base_price: number;
	handling_days: number;
	is_active: boolean;
	updated_at: string | null;
}

export interface AdminService {
	id: string;
	name: string;
	slug: string | null;
	description: string | null;
	service_type: string;
	service_section: string | null;
	base_price: number;
	handling_days: number;
	estimated_days: number | null;
	max_entries: number | null;
	is_active: boolean;
	is_bookable_on_services_page: boolean;
	service_configs: AdminServiceConfig[] | null;
	service_options: AdminServiceOption[] | null;
}

export const SERVICE_SECTIONS = [
	{ value: "", label: "— Không thuộc nhóm —" },
	{ value: "repair", label: "Sửa chữa (repair)" },
	{ value: "switch", label: "Switch" },
	{ value: "stabilizer", label: "Stabilizer" },
	{ value: "lubricant", label: "Bôi trơn (lubricant)" },
	{ value: "pcb", label: "PCB" },
	{ value: "cleaning", label: "Vệ sinh (cleaning)" },
	{ value: "keycap_stem", label: "Keycap / Stem" },
] as const;
