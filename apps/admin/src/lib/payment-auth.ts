import "server-only";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function paymentAdmin(req: NextRequest) {
  // No cross-origin cookie-authenticated payment writes.
  if (req.method !== "GET" && (req.headers.get("origin") !== req.nextUrl.origin ||
      req.headers.get("sec-fetch-site") === "cross-site")) {
    return { error: NextResponse.json({ error: "Invalid origin" }, { status: 403 }) };
  }
  const client = await createClient();
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const { data: profile } = await client.from("users").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  return { user };
}
