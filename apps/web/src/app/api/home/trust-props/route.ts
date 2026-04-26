import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export interface TrustProp {
	id: string;
	heading: string;
	body: string;
	icon: string;
	order: number;
}

export async function GET() {
	try {
		const supabase = await createClient();

		const { data: props, error } = await supabase
			.from("trust_props")
			.select("id, heading, body, icon, order")
			.order("order", { ascending: true });

		if (error) {
			return NextResponse.json(
				{ error: "Failed to fetch trust props" },
				{ status: 500 },
			);
		}

		return NextResponse.json(props as TrustProp[]);
	} catch (err) {
		console.error("[trust props] error:", err);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
