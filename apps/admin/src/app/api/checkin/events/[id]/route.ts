import { createClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await createClient();
  const { data: { user }, error } = await session.auth.getUser();
  if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: profile } = await session.from("users").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await context.params;
  const { error: deleteError } = await (getAdminClient() as any).from("checkin_events").delete().eq("id", id);
  if (deleteError) return NextResponse.json({ error: "Unable to delete event" }, { status: 500 });
  return NextResponse.json({ success: true });
}
