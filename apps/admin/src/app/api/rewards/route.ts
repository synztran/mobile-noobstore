import { getAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = getAdminClient();

  const { data, error } = await (supabase as any)
    .from("reward_items")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const supabase = getAdminClient();

  const payload: Record<string, unknown> = {
    name: body.name,
    reward_type: body.reward_type,
    points_cost: Number(body.points_cost),
    description: body.description ?? null,
    image_url: body.image_url ?? null,
    stock: body.stock != null ? Number(body.stock) : null,
    is_active: body.is_active ?? true,
    metadata: body.metadata ?? {},
  };

  const { error } = await (supabase as any).from("reward_items").insert(payload);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true }, { status: 201 });
}
