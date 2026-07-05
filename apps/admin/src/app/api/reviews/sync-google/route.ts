import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/reviews/sync-google
 *
 * Triggers a sync from Google Business Profile API.
 * Requires GOOGLE_BUSINESS_API_KEY in env to be functional.
 *
 * Currently returns a placeholder — implement fetch logic once API key is set.
 */
export async function POST() {
  try {
    const authClient = await createClient();
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await authClient
      .from("users")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const apiKey = process.env.GOOGLE_BUSINESS_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          error: "GOOGLE_BUSINESS_API_KEY not configured",
          hint: "Add GOOGLE_BUSINESS_API_KEY to your environment variables.",
        },
        { status: 501 }
      );
    }

    const accountId = process.env.GOOGLE_BUSINESS_ACCOUNT_ID;
    const locationId = process.env.GOOGLE_BUSINESS_LOCATION_ID;
    if (!accountId || !locationId) {
      return NextResponse.json(
        {
          error: "Missing GOOGLE_BUSINESS_ACCOUNT_ID or GOOGLE_BUSINESS_LOCATION_ID",
        },
        { status: 501 }
      );
    }

    // --- Google Business Profile API v4 call ---
    // const url = `https://mybusiness.googleapis.com/v4/accounts/${accountId}/locations/${locationId}/reviews`;
    // const res = await fetch(url, { headers: { Authorization: `Bearer ${apiKey}` } });
    // const data = await res.json();
    //
    // Then map and upsert into product_reviews with source = 'google'

    return NextResponse.json({
      success: false,
      message:
        "Google Business Profile API integration not yet wired. Set GOOGLE_BUSINESS_API_KEY and implement fetch logic.",
    });
  } catch (err) {
    console.error("[sync-google] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
