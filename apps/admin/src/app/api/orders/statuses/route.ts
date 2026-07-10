import { getAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const ids = req.nextUrl.searchParams.get("ids") ?? "";
  const orderIds = ids
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (orderIds.length === 0) {
    return NextResponse.json({ error: "ids query param is required" }, { status: 400 });
  }

  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("orders")
    .select("id, status")
    .in("id", orderIds);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const result: Record<string, string> = {};
  for (const row of data ?? []) {
    result[row.id] = row.status;
  }

  return NextResponse.json(result);
}