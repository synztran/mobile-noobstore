import { getAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; addonId: string }> }
) {
  const { addonId } = await params;
  const supabase = getAdminClient();

  try {
    const body = await request.json();
    const updateData: Record<string, any> = {};

    if (body.discount_type !== undefined) updateData.discount_type = body.discount_type;
    if (body.discount_value !== undefined) updateData.discount_value = Number(body.discount_value);
    if (body.is_active !== undefined) updateData.is_active = Boolean(body.is_active);
    if (body.sort_order !== undefined) updateData.sort_order = Number(body.sort_order);

    updateData.updated_at = new Date().toISOString();

    const { data, error } = await (supabase as any)
      .from("product_addons")
      .update(updateData)
      .eq("id", addonId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid payload" },
      { status: 400 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; addonId: string }> }
) {
  const { addonId } = await params;
  const supabase = getAdminClient();

  const { error } = await (supabase as any)
    .from("product_addons")
    .delete()
    .eq("id", addonId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
