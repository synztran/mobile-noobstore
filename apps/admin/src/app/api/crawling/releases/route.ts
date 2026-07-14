import { getAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const VALID_TYPES = ["SALE", "GROUP_BUY", "NEW_RELEASE"];

export async function GET() {
  const supabase = getAdminClient();

  const { data, error } = await supabase
    .from("maker_releases")
    .select("*, vendor:vendors(*)")
    .order("published_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const supabase = getAdminClient();

  const payload = {
    title: body.title?.trim() ?? "New Release",
    content: body.content ?? "",
    excerpt: body.excerpt?.trim() ?? null,
    source_url: body.source_url?.trim() ?? null,
    maker_name: body.maker_name?.trim() ?? null,
    thumbnail: body.thumbnail?.trim() ?? null,
    vendor_id: body.vendor_id || null,
    type: VALID_TYPES.includes(body.type) ? body.type : "NEW_RELEASE",
    published_at: new Date().toISOString(),
  };

  if (!payload.content) {
    return NextResponse.json({ error: "Content is required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("maker_releases")
    .insert(payload)
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ id: data.id }, { status: 201 });
}
