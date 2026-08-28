import { getAdminClient } from "@/lib/supabase/admin";
import { recheckWatch, pollLatestSnapshot, getWatch } from "@/lib/changedetection";
import { sanitizeHtml } from "@/lib/sanitize";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const supabase = getAdminClient();

  try {
    const { data: source } = await supabase
      .from("crawling_sources")
      .select("*")
      .eq("id", id)
      .single();

    if (!source) {
      return NextResponse.json(
        { status: "error", message: "Source not found", items_found: 0, items_created: 0 },
        { status: 404 }
      );
    }

    if (!source.watch_id) {
      return NextResponse.json(
        { status: "error", message: "No watch_id set. Source not synced with changedetection.io.", items_found: 0, items_created: 0 },
        { status: 400 }
      );
    }

    // Trigger recheck in changedetection.io
    await recheckWatch(source.watch_id);

    // Poll for latest snapshot
    const snapshot = await pollLatestSnapshot(source.watch_id, 15, 2000);

    if (!snapshot || snapshot.trim().length === 0) {
      await supabase.from("crawling_history").insert({
        source_id: id,
        status: "no_change",
        message: "No snapshot available after recheck",
        items_found: 0,
        items_created: 0,
      });

      return NextResponse.json({ status: "no_change", items_found: 0, items_created: 0 });
    }

    const watchInfo = await getWatch(source.watch_id);
    const detectedUrl = watchInfo?.url ?? source.url;
    const pageTitle = watchInfo?.page_title ?? source.name;

    // Create detection in our DB
    const { error: insertError } = await supabase
      .from("crawling_detections")
      .insert({
        source_id: id,
        content_hash: `${source.watch_id}-${Date.now()}`,
        detected_title: pageTitle.slice(0, 200),
        detected_content: sanitizeHtml(snapshot),
        detected_url: detectedUrl,
        status: "pending",
      });

    if (insertError) {
      if (insertError.code === "23505") {
        await supabase.from("crawling_history").insert({
          source_id: id,
          status: "no_change",
          message: "Duplicate detection skipped",
          items_found: 0,
          items_created: 0,
        });

        return NextResponse.json({ status: "no_change", items_found: 0, items_created: 0 });
      }

      throw insertError;
    }

    await supabase
      .from("crawling_sources")
      .update({ last_crawled_at: new Date().toISOString() })
      .eq("id", id);

    await supabase.from("crawling_history").insert({
      source_id: id,
      status: "success",
      message: "Recheck completed via changedetection.io",
      items_found: 1,
      items_created: 1,
    });

    return NextResponse.json({ status: "success", items_found: 1, items_created: 1 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";

    await supabase.from("crawling_history").insert({
      source_id: id,
      status: "error",
      message,
      items_found: 0,
      items_created: 0,
    });

    return NextResponse.json(
      { status: "error", message, items_found: 0, items_created: 0 },
      { status: 500 }
    );
  }
}
