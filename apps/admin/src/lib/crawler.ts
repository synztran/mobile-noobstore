import { getAdminClient } from "@/lib/supabase/admin";
import { recheckWatch, pollLatestSnapshot } from "@/lib/changedetection";

type CrawlingSource = {
  id: string;
  name: string;
  url: string;
  selector: string | null;
  schedule_days: number[];
  schedule_time: string;
  category: string;
  author: string;
  status: string;
  watch_id: string | null;
  last_content_hash: string | null;
  last_crawled_at: string | null;
};

function parseTime(timeStr: string): { hour: number; minute: number } {
  const parts = timeStr.split(":");
  return {
    hour: parseInt(parts[0] ?? "0", 10),
    minute: parseInt(parts[1] ?? "0", 10),
  };
}

export function shouldRunToday(source: CrawlingSource): boolean {
  const now = new Date();
  const currentDay = now.getDay();
  if (!source.schedule_days.includes(currentDay)) return false;

  const { hour, minute } = parseTime(source.schedule_time);
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const scheduleMinutes = hour * 60 + minute;
  const windowEnd = scheduleMinutes + 30;

  return currentMinutes >= scheduleMinutes && currentMinutes < windowEnd;
}

export async function processSource(
  sourceId: string
): Promise<{
  status: "success" | "error" | "no_change";
  message?: string;
  items_found: number;
  items_created: number;
}> {
  const supabase = getAdminClient();

  const { data: source, error: sourceError } = await supabase
    .from("crawling_sources")
    .select("*")
    .eq("id", sourceId)
    .single();

  if (sourceError || !source) {
    return {
      status: "error",
      message: `Source not found: ${sourceError?.message}`,
      items_found: 0,
      items_created: 0,
    };
  }

  const src = source as CrawlingSource;

  if (!src.watch_id) {
    return { status: "no_change", message: "No watch_id (not synced with changedetection.io)", items_found: 0, items_created: 0 };
  }

  try {
    await recheckWatch(src.watch_id);
    const snapshot = await pollLatestSnapshot(src.watch_id, 10, 2000);

    if (!snapshot || snapshot.trim().length === 0) {
      await supabase.from("crawling_history").insert({
        source_id: src.id,
        status: "no_change",
        message: "No content found after recheck",
        items_found: 0,
        items_created: 0,
      });
      return { status: "no_change", items_found: 0, items_created: 0 };
    }

    const { error: insertError } = await supabase
      .from("crawling_detections")
      .insert({
        source_id: src.id,
        content_hash: `${src.watch_id}-${Date.now()}`,
        detected_content: snapshot,
        detected_url: src.url,
        status: "pending",
      });

    if (insertError) {
      if (insertError.code === "23505") {
        await supabase.from("crawling_history").insert({
          source_id: src.id,
          status: "no_change",
          message: "Duplicate detection skipped",
          items_found: 0,
          items_created: 0,
        });
        return { status: "no_change", items_found: 0, items_created: 0 };
      }
      throw insertError;
    }

    await supabase
      .from("crawling_sources")
      .update({ last_crawled_at: new Date().toISOString() })
      .eq("id", src.id);

    await supabase.from("crawling_history").insert({
      source_id: src.id,
      status: "success",
      message: "Change detected via changedetection.io",
      items_found: 1,
      items_created: 1,
    });

    return { status: "success", items_found: 1, items_created: 1 };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    await supabase.from("crawling_history").insert({
      source_id: src.id,
      status: "error",
      message,
      items_found: 0,
      items_created: 0,
    });
    return { status: "error", message, items_found: 0, items_created: 0 };
  }
}
