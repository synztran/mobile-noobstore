import { getAdminClient } from "@/lib/supabase/admin";
import { updateWatch, deleteWatch } from "@/lib/changedetection";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const STRING_FIELDS = ["name", "url", "selector", "category", "author", "status"] as const;
const VALID_TYPES = ["SALE", "GROUP_BUY", "NEW_RELEASE"];

export async function PATCH(req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const body = await req.json();
  const supabase = getAdminClient();

  const sanitized: Record<string, unknown> = {};

  for (const field of STRING_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      sanitized[field] = body[field]?.trim() ?? null;
    }
  }

  if (Object.prototype.hasOwnProperty.call(body, "schedule_days")) {
    sanitized.schedule_days = Array.isArray(body.schedule_days) ? body.schedule_days : [];
  }

  if (Object.prototype.hasOwnProperty.call(body, "schedule_time")) {
    sanitized.schedule_time = body.schedule_time;
  }

  if (Object.prototype.hasOwnProperty.call(body, "vendor_id")) {
    sanitized.vendor_id = body.vendor_id || null;
  }

  if (Object.prototype.hasOwnProperty.call(body, "type")) {
    sanitized.type = VALID_TYPES.includes(body.type) ? body.type : "NEW_RELEASE";
  }

  if (Object.keys(sanitized).length === 0) {
    return NextResponse.json(
      { error: "No valid fields to update" },
      { status: 400 }
    );
  }

  const { data: source } = await supabase
    .from("crawling_sources")
    .select("watch_id")
    .eq("id", id)
    .single();

  const { error } = await supabase
    .from("crawling_sources")
    .update(sanitized as any)
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Sync with changedetection.io
  if (source?.watch_id) {
    try {
      const cdUpdates: Record<string, unknown> = {};
      if (sanitized.url) cdUpdates.url = sanitized.url;
      if (sanitized.name) cdUpdates.title = sanitized.name;
      if (sanitized.selector) cdUpdates.include_filters = [sanitized.selector];
      if (sanitized.status) cdUpdates.paused = sanitized.status === "paused";

      if (Object.keys(cdUpdates).length > 0) {
        await updateWatch(source.watch_id, cdUpdates);
      }
    } catch (err) {
      console.error("Failed to sync watch with changedetection.io:", err);
    }
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const supabase = getAdminClient();

  // Fetch watch_id before deleting
  const { data: source } = await supabase
    .from("crawling_sources")
    .select("watch_id")
    .eq("id", id)
    .single();

  const { error } = await supabase
    .from("crawling_sources")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Delete watch from changedetection.io
  if (source?.watch_id) {
    try {
      await deleteWatch(source.watch_id);
    } catch (err) {
      console.error("Failed to delete watch from changedetection.io:", err);
    }
  }

  return NextResponse.json({ success: true });
}
