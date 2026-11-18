import { getAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const CARRIER_SELECT = "id, name, logo, tracking_url_template, is_active, sort_order";

type CarrierPatch = {
  name: string;
  logo: string | null;
  tracking_url_template: string | null;
  is_active: boolean;
  sort_order: number;
};

export async function GET(_req: NextRequest) {
	const supabase = getAdminClient();

	const { data, error } = await supabase
		.from("carriers")
		.select(CARRIER_SELECT)
		.order("sort_order", { ascending: true });

	if (error) {
		return NextResponse.json({ error: error.message }, { status: 500 });
	}

	return NextResponse.json({ carriers: data ?? [] });
}

/**
 * Lets an operator wire up (or correct) a carrier's public tracking page. Each
 * field is validated and copied into a fresh payload, so nothing else from the
 * request body can reach the table. `id` is immutable — orders already reference
 * it as a foreign key.
 */
export async function PATCH(req: NextRequest) {
	try {
		const body = await req.json();
		const id = typeof body.id === "string" ? body.id.trim() : "";

		if (!id) {
			return NextResponse.json({ error: "id is required" }, { status: 400 });
		}

		const payload: Partial<CarrierPatch> = {};

		if (body.name !== undefined) {
			if (typeof body.name !== "string" || !body.name.trim()) {
				return NextResponse.json(
					{ error: "name must be a non-empty string" },
					{ status: 400 }
				);
			}
			payload.name = body.name.trim();
		}

		// Empty string clears the template — the customer then sees the carrier
		// name and a copyable tracking number with no "open tracking page" link.
		if (body.tracking_url_template !== undefined) {
			if (
				body.tracking_url_template !== null &&
				typeof body.tracking_url_template !== "string"
			) {
				return NextResponse.json(
					{ error: "tracking_url_template must be a string or null" },
					{ status: 400 }
				);
			}
			const template = (body.tracking_url_template ?? "").trim();
			payload.tracking_url_template = template || null;
		}

		if (body.logo !== undefined) {
			payload.logo =
				typeof body.logo === "string" && body.logo.trim()
					? body.logo.trim()
					: null;
		}

		if (body.is_active !== undefined) {
			if (typeof body.is_active !== "boolean") {
				return NextResponse.json(
					{ error: "is_active must be a boolean" },
					{ status: 400 }
				);
			}
			payload.is_active = body.is_active;
		}

		if (body.sort_order !== undefined) {
			const order = Number(body.sort_order);
			if (!Number.isInteger(order) || order < 0) {
				return NextResponse.json(
					{ error: "sort_order must be a non-negative integer" },
					{ status: 400 }
				);
			}
			payload.sort_order = order;
		}

		if (Object.keys(payload).length === 0) {
			return NextResponse.json(
				{ error: "No valid fields to update" },
				{ status: 400 }
			);
		}

		const supabase = getAdminClient();
		const { data, error } = await supabase
			.from("carriers")
			.update(payload)
			.eq("id", id)
			.select(CARRIER_SELECT)
			.maybeSingle();

		if (error) {
			return NextResponse.json({ error: error.message }, { status: 500 });
		}

		if (!data) {
			return NextResponse.json({ error: "Carrier not found" }, { status: 404 });
		}

		// carriers is not behind the redis cache (it is read inline per order),
		// so there is nothing to invalidate here.
		return NextResponse.json({ carrier: data });
	} catch (err) {
		return NextResponse.json(
			{ error: err instanceof Error ? err.message : "Unknown error" },
			{ status: 500 }
		);
	}
}
