import { getAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const supabase = getAdminClient();
  const { error } = await supabase.from("categories").insert(body);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ success: true }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, ...updates } = body;
  if (!id) {
    return NextResponse.json({ error: "Missing category id" }, { status: 400 });
  }
  const supabase = getAdminClient();
  const { error } = await supabase
    .from("categories")
    .update(updates)
    .eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ success: true });
}

export async function GET() {
  const supabase = getAdminClient();
  const { data: categories, error } = await supabase
    .from("categories")
    .select("*")
    .order("name", { ascending: true });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json(categories);
}
