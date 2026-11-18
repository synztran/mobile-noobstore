import { getAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const CONFIG_KEY = "product_standard_bg";

export async function GET() {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("app_config")
    .select("value")
    .eq("key", CONFIG_KEY)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ backgroundUrl: data?.value ?? null });
}

export async function POST(req: NextRequest) {
  let body: { backgroundUrl?: string } | null = null;
  try {
    body = (await req.json()) as { backgroundUrl?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const url = body?.backgroundUrl;
  if (!url || !url.startsWith("http")) {
    return NextResponse.json(
      { error: "backgroundUrl (http...) is required" },
      { status: 400 },
    );
  }

  const supabase = getAdminClient();
  const { error } = await supabase
    .from("app_config")
    .upsert({ key: CONFIG_KEY, value: url }, { onConflict: "key" });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ backgroundUrl: url });
}