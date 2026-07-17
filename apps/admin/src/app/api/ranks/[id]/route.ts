import { getAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(_req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const body = await _req.json();
  const supabase = getAdminClient();

  const payload: Record<string, unknown> = {};
  const allowedFields = [
    "name", "slug", "level", "min_total_spent", "min_order_count",
    "benefits", "color", "icon_url", "icon_label", "is_active",
  ] as const;

  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      payload[field] = body[field];
    }
  }

  if (Object.keys(payload).length === 0) {
    return NextResponse.json(
      { error: "No valid fields to update" },
      { status: 400 }
    );
  }

  payload.updated_at = new Date().toISOString();

  const { error } = await supabase
    .from("customer_ranks")
    .update(payload as any)
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const supabase = getAdminClient();

  const { error } = await supabase
    .from("customer_ranks")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
