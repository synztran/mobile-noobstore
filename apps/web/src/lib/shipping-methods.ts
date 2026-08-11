import { getPublicClient } from "@/lib/supabase/public";

export interface ShippingMethod {
	id: string;
	name: string;
	description: string | null;
	estimated_hours_min: number | null;
	estimated_hours_max: number | null;
	is_active: boolean;
	sort_order: number;
}

export async function getShippingMethods(): Promise<ShippingMethod[]> {
	const supabase = getPublicClient();

	const { data, error } = await supabase
		.from("shipping_methods")
		.select(
			"id, name, description, estimated_hours_min, estimated_hours_max, is_active, sort_order",
		)
		.order("sort_order");

	if (error) {
		throw new Error(error.message);
	}

	return (data ?? []) as unknown as ShippingMethod[];
}