import { createClient } from "@/lib/supabase/server";
import {
  fetchUserProfile,
  replaceAddresses,
  updateProfileFields,
} from "@/modules/user/server/profile";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { supabase: null, user: null, unauthorized: true };
  }
  return { supabase, user, unauthorized: false };
}

function respond(result: {
  status: number;
  data?: unknown;
  error?: string;
}): NextResponse {
  if (result.status === 200) {
    return NextResponse.json(result.data);
  }
  return NextResponse.json({ error: result.error }, { status: result.status });
}

// ─── GET /api/user/profile ────────────────────────────────────────────────────
// Returns the authenticated user's record from the users table.

export async function GET() {
  try {
    const { supabase, user, unauthorized } = await requireUser();

    if (unauthorized || !supabase || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await fetchUserProfile(supabase, user);
    return respond(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// ─── POST /api/user/profile ───────────────────────────────────────────────────
// Replaces the authenticated user's addresses.
// Accepted body fields: addresses[] or address[]

export async function POST(req: NextRequest) {
  try {
    const { supabase, user, unauthorized } = await requireUser();

    if (unauthorized || !supabase || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: unknown = await req.json();
    const result = await replaceAddresses(supabase, user, body);
    return respond(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// ─── PATCH /api/user/profile ──────────────────────────────────────────────────
// Updates the authenticated user's profile.
// Accepted body fields: first_name, last_name, phone_number

export async function PATCH(req: NextRequest) {
  try {
    const { supabase, user, unauthorized } = await requireUser();

    if (unauthorized || !supabase || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: unknown = await req.json();
    const result = await updateProfileFields(supabase, user, body);
    return respond(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
