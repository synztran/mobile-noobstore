import { getAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("customer_ranks")
    .select("*")
    .order("level", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const supabase = getAdminClient();

  const payload = {
    name: body.name,
    slug: body.slug,
    level: body.level,
    min_total_spent: body.min_total_spent ?? 0,
    min_order_count: body.min_order_count ?? 0,
    benefits: body.benefits ?? {},
    color: body.color ?? "#6B7280",
    icon_url: body.icon_url ?? null,
    icon_label: body.icon_label ?? null,
    is_active: body.is_active ?? true,
  };

  const { error } = await supabase.from("customer_ranks").insert(payload);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true }, { status: 201 });
}
