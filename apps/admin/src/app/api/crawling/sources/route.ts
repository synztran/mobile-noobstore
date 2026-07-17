import { getAdminClient } from "@/lib/supabase/admin";
import { createWatch } from "@/lib/changedetection";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = getAdminClient();

  const { data, error } = await supabase
    .from("crawling_sources")
    .select("*, vendor:vendors(*)")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const supabase = getAdminClient();

  const VALID_TYPES = ["SALE", "GROUP_BUY", "NEW_RELEASE"];

  const payload = {
    name: body.name?.trim() ?? "",
    url: body.url?.trim() ?? "",
    selector: body.selector?.trim() || null,
    schedule_days: Array.isArray(body.schedule_days)
      ? body.schedule_days
      : [1, 2, 3, 4, 5, 6],
    schedule_time: body.schedule_time || "08:00",
    category: body.category?.trim() || "Maker News",
    author: body.author?.trim() || "NoobStore",
    status: body.status || "active",
    vendor_id: body.vendor_id || null,
    type: VALID_TYPES.includes(body.type) ? body.type : "NEW_RELEASE",
  };

  if (!payload.name || !payload.url) {
    return NextResponse.json(
      { error: "Name and URL are required" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("crawling_sources")
    .insert(payload)
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const sourceId = data.id;

  // Create watch in changedetection.io
  let watchId: string | null = null;
  try {
    watchId = await createWatch(sourceId, {
      url: payload.url,
      title: payload.name,
      css_selector: payload.selector ?? undefined,
      paused: payload.status === "paused",
    });

    await supabase
      .from("crawling_sources")
      .update({ watch_id: watchId })
      .eq("id", sourceId);
  } catch (err) {
    // If changedetection.io is unavailable, log but don't fail
    console.error("Failed to create watch in changedetection.io:", err);
  }

  return NextResponse.json(
    { id: sourceId, watch_id: watchId },
    { status: 201 }
  );
}
