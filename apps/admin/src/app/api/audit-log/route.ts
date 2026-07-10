import { getAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const page = Math.max(1, parseInt(sp.get("page") ?? "1", 10));
  const action = sp.get("action") ?? "";
  const entityType = sp.get("entity_type") ?? "";

  const supabase = getAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase.from as any)("admin_audit_log")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  if (action) query = query.eq("action", action);
  if (entityType) query = query.eq("entity_type", entityType);

  const { data, count, error } = await query;

  if (error) {
    return NextResponse.json({ error: (error as { message: string }).message }, { status: 500 });
  }

  return NextResponse.json({
    logs: data ?? [],
    count: count ?? 0,
    page,
    totalPages: Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE)),
  });
}