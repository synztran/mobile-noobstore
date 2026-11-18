import { getAdminClient } from "@/lib/supabase/admin";
import { invalidateProductCaches } from "@/lib/redis/cache";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const supabase = getAdminClient();
  const { error } = await supabase.from("product_variants").insert(body);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  await invalidateProductCaches();
  return NextResponse.json({ success: true }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const { id, ...fields } = await req.json();
  if (!id) {
    return NextResponse.json({ error: "Missing variant id" }, { status: 400 });
  }
  const supabase = getAdminClient();
  const { error } = await supabase
    .from("product_variants")
    .update(fields)
    .eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  await invalidateProductCaches();
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  if (!id) {
    return NextResponse.json({ error: "Missing variant id" }, { status: 400 });
  }
  const supabase = getAdminClient();
  const { error } = await supabase
    .from("product_variants")
    .delete()
    .eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  await invalidateProductCaches();
  return NextResponse.json({ success: true });
}
