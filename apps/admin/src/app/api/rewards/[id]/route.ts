import { getAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const supabase = getAdminClient();

    const payload: Record<string, unknown> = {};
    if (body.name !== undefined) payload.name = body.name;
    if (body.reward_type !== undefined) payload.reward_type = body.reward_type;
    if (body.points_cost !== undefined)
      payload.points_cost = Number(body.points_cost);
    if (body.description !== undefined) payload.description = body.description;
    if (body.image_url !== undefined) payload.image_url = body.image_url;
    if (body.stock !== undefined)
      payload.stock = body.stock != null ? Number(body.stock) : null;
    if (body.is_active !== undefined) payload.is_active = body.is_active;
    if (body.metadata !== undefined) payload.metadata = body.metadata;

    if (Object.keys(payload).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 },
      );
    }

    payload.updated_at = new Date().toISOString();

    const { error } = await (supabase as any)
      .from("reward_items")
      .update(payload)
      .eq("id", id);

    if (error) {
      console.error("[rewards PATCH] Supabase error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown server error";
    console.error("[rewards PATCH] Unhandled error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
