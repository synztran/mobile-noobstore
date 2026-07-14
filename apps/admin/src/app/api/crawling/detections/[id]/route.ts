import { getAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const body = await req.json();
  const supabase = getAdminClient();

  const { status, release_id } = body;

  if (!status || !["pending", "approved", "rejected"].includes(status)) {
    return NextResponse.json({ error: "Valid status is required" }, { status: 400 });
  }

  if (status === "approved" && release_id) {
    const { error } = await supabase
      .from("crawling_detections")
      .update({ status, release_id })
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
  } else {
    const { error } = await supabase
      .from("crawling_detections")
      .update({ status })
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
  }

  return NextResponse.json({ success: true });
}
