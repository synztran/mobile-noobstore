import { getAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = getAdminClient();

  const { data, error } = await supabase
    .from("crawling_detections")
    .select("*, source:crawling_sources(name, vendor_id, type)")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { ids, status, release_id } = body;
  const supabase = getAdminClient();

  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "ids array is required" }, { status: 400 });
  }

  if (status === "approved" && release_id) {
    const { error: updateError } = await supabase
      .from("crawling_detections")
      .update({ status, release_id })
      .in("id", ids);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }
  } else {
    const { error: updateError } = await supabase
      .from("crawling_detections")
      .update({ status })
      .in("id", ids);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }
  }

  return NextResponse.json({ success: true });
}
