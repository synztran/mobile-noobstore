import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export interface ShippingMethod {
	id: string;
	name: string;
	description: string | null;
	estimated_hours_min: number | null;
	estimated_hours_max: number | null;
	is_active: boolean;
	sort_order: number;
}

export async function GET() {
	const supabase = await createClient();
	const { data, error } = await supabase
		.from("shipping_methods")
		.select(
			"id, name, description, estimated_hours_min, estimated_hours_max, is_active, sort_order",
		)
		.order("sort_order");

	if (error) {
		return NextResponse.json({ error: error.message }, { status: 500 });
	}

	return NextResponse.json(data ?? []);
}
