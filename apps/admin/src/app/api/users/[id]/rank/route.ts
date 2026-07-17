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

  const payload: Record<string, unknown> = {
    rank_id: body.rank_id ?? null,
    rank_updated_at: body.rank_id ? new Date().toISOString() : null,
  };

  const { error: updateError } = await supabase
    .from("users")
    .update(payload as any)
    .eq("id", id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }

  if (body.rank_id) {
    const { error: historyError } = await supabase
      .from("rank_history")
      .insert({
        user_id: id,
        to_rank_id: body.rank_id,
        from_rank_id: body.from_rank_id ?? null,
        changed_by: "admin",
        reason: body.reason ?? "Admin override",
      });

    if (historyError) {
      console.error("[admin] Failed to record rank history:", historyError);
    }
  }

  return NextResponse.json({ success: true });
}
