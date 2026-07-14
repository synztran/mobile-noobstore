import { getAdminClient } from "@/lib/supabase/admin";
import { processSource, shouldRunToday } from "@/lib/crawler";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST() {
  const supabase = getAdminClient();

  const { data: sources, error } = await supabase
    .from("crawling_sources")
    .select("*")
    .eq("status", "active");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!sources || sources.length === 0) {
    return NextResponse.json({ processed: 0, message: "No active sources" });
  }

  const results: { source_id: string; name: string; result: any }[] = [];

  for (const source of sources as any[]) {
    if (!shouldRunToday(source)) continue;
    if (!source.watch_id) continue;

    const result = await processSource(source.id);
    results.push({ source_id: source.id, name: source.name, result });
  }

  return NextResponse.json({
    processed: results.length,
    results,
  });
}
