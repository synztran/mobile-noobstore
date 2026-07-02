import type { Json } from "@/lib/supabase/database.types";

export interface ServicePricingRule {
	id: string;
	service_type: string;
	key: string;
	label: string;
	price: number;
	handling_days: number;
	sort_order: number;
	metadata: Json;
	created_at: string | null;
	updated_at: string | null;
}

export type ServicePricingType =
	| "cleaning_keyboard"
	| "cleaning_keycap"
	| "cleaning_switch_bundle"
	| "switch_lube_type"
	| "switch_lube_status"
	| "keycap_stem";
