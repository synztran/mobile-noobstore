import { getAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/admin/points/rules/[id]
 * Update a point rule's rate_value or is_active.
 * Body: { rate_value?: number; rate_type?: string; is_active?: boolean; description?: string }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = getAdminClient();

  let body: {
    rate_value?: number;
    rate_type?: string;
    is_active?: boolean;
    description?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const update: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (body.rate_value !== undefined) {
    if (typeof body.rate_value !== "number" || body.rate_value < 0) {
      return NextResponse.json(
        { error: "rate_value must be a non-negative number" },
        { status: 400 }
      );
    }
    update.rate_value = body.rate_value;
  }
  if (body.rate_type !== undefined) update.rate_type = body.rate_type;
  if (body.is_active !== undefined) update.is_active = body.is_active;
  if (body.description !== undefined) update.description = body.description;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("point_rules")
    .update(update)
    .eq("id", Number(id))
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ rule: data });
}
