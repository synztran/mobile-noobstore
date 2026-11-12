import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("gacha_events")
    .select("id")
    .eq("is_active", true)
    .lte("start_at", now)
    .gte("end_at", now)
    .order("id", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ event: null }, { status: 500 });
  }

  return NextResponse.json({ event: data });
}
