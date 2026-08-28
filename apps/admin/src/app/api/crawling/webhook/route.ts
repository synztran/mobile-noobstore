import { getAdminClient } from "@/lib/supabase/admin";
import { getWatch, getLatestSnapshot } from "@/lib/changedetection";
import { sanitizeHtml } from "@/lib/sanitize";
import { createHash, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Fail-closed shared-secret auth for the external changedetection.io webhook.
 * The webhook has no browser session, so it cannot use requireAdmin(); instead
 * the caller must present the configured secret.
 */
function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRAWLING_WEBHOOK_SECRET;
  if (!secret) return false;

  const provided =
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    req.headers.get("x-webhook-secret") ??
    "";
  if (!provided) return false;

  const a = createHash("sha256").update(provided).digest();
  const b = createHash("sha256").update(secret).digest();
  return timingSafeEqual(a, b);
}

async function extractWatchId(body: unknown): Promise<string | null> {
  if (typeof body === "object" && body !== null) {
    const obj = body as Record<string, unknown>;

    if (typeof obj.watch_uuid === "string") return obj.watch_uuid;
    if (typeof obj.uuid === "string") return obj.uuid;
    if (typeof obj.watch_uuid === "string") return obj.watch_uuid;
  }
  return null;
}

async function extractWatchUrl(body: unknown): Promise<string | null> {
  if (typeof body === "object" && body !== null) {
    const obj = body as Record<string, unknown>;

    if (typeof obj.watch_url === "string") return obj.watch_url;
    if (typeof obj.url === "string") return obj.url;
  }
  return null;
}

async function createDetectionFromSnapshot(
  supabase: ReturnType<typeof getAdminClient>,
  sourceId: string,
  watchId: string
): Promise<{ created: boolean; error?: string }> {
  try {
    const [snapshot, watchInfo] = await Promise.all([
      getLatestSnapshot(watchId),
      getWatch(watchId),
    ]);

    if (!snapshot || snapshot.trim().length === 0) {
      return { created: false, error: "Empty snapshot" };
    }

    const detectedUrl = watchInfo?.url ?? "";
    const pageTitle = watchInfo?.page_title ?? watchInfo?.title ?? "New Release";

    const { data: existing } = await supabase
      .from("crawling_detections")
      .select("id")
      .eq("source_id", sourceId)
      .eq("detected_url", detectedUrl)
      .order("created_at", { ascending: false })
      .limit(1);

    if (existing && existing.length > 0) {
      return { created: false, error: "Duplicate detection (same source + URL)" };
    }

    const { error: insertError } = await supabase
      .from("crawling_detections")
      .insert({
        source_id: sourceId,
        content_hash: `${watchId}-${Date.now()}`,
        detected_title: pageTitle.slice(0, 200),
        detected_content: sanitizeHtml(snapshot),
        detected_url: detectedUrl,
        status: "pending",
      });

    if (insertError) {
      if (insertError.code === "23505") {
        return { created: false, error: "Duplicate detection (unique constraint)" };
      }
      return { created: false, error: insertError.message };
    }

    await supabase
      .from("crawling_sources")
      .update({ last_crawled_at: new Date().toISOString() })
      .eq("id", sourceId);

    await supabase.from("crawling_history").insert({
      source_id: sourceId,
      status: "success",
      message: "Change detected via webhook",
      items_found: 1,
      items_created: 1,
    });

    return { created: true };
  } catch (err) {
    return {
      created: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getAdminClient();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = null;
  }

  let watchId: string | null = null;
  let watchUrl: string | null = null;

  if (body) {
    watchId = await extractWatchId(body);
    watchUrl = await extractWatchUrl(body);
  }

  if (!watchId && watchUrl) {
    const { data: source } = await supabase
      .from("crawling_sources")
      .select("watch_id")
      .eq("url", watchUrl)
      .single();

    if (source?.watch_id) {
      watchId = source.watch_id;
    }
  }

  if (!watchId) {
    return NextResponse.json({ status: "ignored", reason: "Could not identify watch" });
  }

  const { data: sources } = await supabase
    .from("crawling_sources")
    .select("id, watch_id")
    .eq("watch_id", watchId);

  if (!sources || sources.length === 0) {
    return NextResponse.json({ status: "ignored", reason: "No matching source found" });
  }

  const results: { source_id: string; created: boolean; error?: string }[] = [];

  for (const source of sources) {
    const result = await createDetectionFromSnapshot(
      supabase,
      source.id,
      watchId
    );
    results.push({ source_id: source.id, ...result });
  }

  return NextResponse.json({ status: "processed", results });
}
