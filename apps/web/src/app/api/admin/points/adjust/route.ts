import { getAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { CACHE_KEYS, invalidateCache } from "@/lib/redis/cache";
import { adminAdjustPoints } from "@/lib/points/service";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/points/adjust
 * Admin-only: manually add or deduct points from a customer.
 * Body: { user_id: string, delta: number, note?: string }
 *
 * delta > 0 → credit; delta < 0 → deduct.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify the caller is an admin
  const { data: callerProfile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (callerProfile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { user_id: string; delta: number; note?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { user_id, delta, note } = body;

  if (!user_id || delta === undefined || delta === null || delta === 0) {
    return NextResponse.json(
      { error: "user_id and non-zero delta are required" },
      { status: 400 }
    );
  }

  if (!Number.isInteger(delta)) {
    return NextResponse.json(
      { error: "delta must be an integer" },
      { status: 400 }
    );
  }

  const admin = getAdminClient();

  try {
    const result = await adminAdjustPoints(
      admin,
      user.id,
      user_id,
      delta,
      note
    );
    await invalidateCache(CACHE_KEYS.pointsBalance(user_id));
    return NextResponse.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);

    if (msg.includes("not an admin")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (msg.includes("negative balance")) {
      return NextResponse.json(
        { error: "Adjustment would result in a negative balance" },
        { status: 400 }
      );
    }
    if (msg.includes("profile not found")) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    console.error("[admin/points/adjust] unexpected error:", err);
    return NextResponse.json(
      { error: "Failed to adjust points" },
      { status: 500 }
    );
  }
}
