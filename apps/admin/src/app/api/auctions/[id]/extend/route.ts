import { getAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const minutes = Number(body?.minutes || 30);
  const supabase = getAdminClient();

  // Fetch current auction
  const { data: current, error: fetchErr } = await (supabase as any)
    .from("auction_products")
    .select("ends_at, status")
    .eq("id", id)
    .maybeSingle();

  if (fetchErr || !current) {
    return NextResponse.json({ error: "Không tìm thấy phiên đấu giá" }, { status: 404 });
  }

  const currentEnd = new Date(current.ends_at);
  const baseTime = currentEnd > new Date() ? currentEnd : new Date();
  const newEndsAt = new Date(baseTime.getTime() + minutes * 60 * 1000).toISOString();

  const { data, error } = await (supabase as any)
    .from("auction_products")
    .update({
      ends_at: newEndsAt,
      status: current.status === "ended" ? "active" : current.status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, auction: data });
}
