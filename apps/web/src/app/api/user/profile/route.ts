import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// ─── GET /api/user/profile ────────────────────────────────────────────────────
// Returns the authenticated user's record from the users table.

export async function GET() {
	try {
		const supabase = await createClient();

		const {
			data: { user },
			error: authError,
		} = await supabase.auth.getUser();

		if (authError || !user) {
			return NextResponse.json(
				{ error: "Unauthorized" },
				{ status: 401 },
			);
		}

		const { data: profile, error } = await supabase
			.from("users")
			.select(
				"id, email, first_name, last_name, phone_number, role, created_at",
			)
			.eq("id", user.id)
			.maybeSingle();

		if (error) {
			return NextResponse.json({ error: error.message }, { status: 500 });
		}

		if (!profile) {
			return NextResponse.json(
				{ error: "User not found" },
				{ status: 404 },
			);
		}

		return NextResponse.json(profile);
	} catch (err) {
		return NextResponse.json(
			{ error: err instanceof Error ? err.message : "Unknown error" },
			{ status: 500 },
		);
	}
}

// ─── PATCH /api/user/profile ──────────────────────────────────────────────────
// Updates the authenticated user's profile.
// Accepted body fields: first_name, last_name, phone_number

export async function PATCH(req: NextRequest) {
	try {
		const supabase = await createClient();

		const {
			data: { user },
			error: authError,
		} = await supabase.auth.getUser();

		if (authError || !user) {
			return NextResponse.json(
				{ error: "Unauthorized" },
				{ status: 401 },
			);
		}

		const body = await req.json();

		const allowedFields = [
			"first_name",
			"last_name",
			"phone_number",
		] as const;
		type UserUpdate = {
			first_name?: string | null;
			last_name?: string | null;
			phone_number?: string | null;
		};
		const updates: UserUpdate = {};
		for (const field of allowedFields) {
			if (field in body) {
				(updates as Record<string, unknown>)[field] = body[field];
			}
		}

		if (Object.keys(updates).length === 0) {
			return NextResponse.json(
				{ error: "No valid fields to update" },
				{ status: 400 },
			);
		}

		const { data: profile, error } = await supabase
			.from("users")
			.update(updates)
			.eq("id", user.id)
			.select(
				"id, email, first_name, last_name, phone_number, role, created_at",
			)
			.single();

		if (error) {
			return NextResponse.json({ error: error.message }, { status: 500 });
		}

		return NextResponse.json(profile);
	} catch (err) {
		return NextResponse.json(
			{ error: err instanceof Error ? err.message : "Unknown error" },
			{ status: 500 },
		);
	}
}
