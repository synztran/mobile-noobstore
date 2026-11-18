import { createClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { processVoucherBatch } from "@/lib/checkin-voucher-batches";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await createClient();
  const { data: { user }, error } = await session.auth.getUser();
  if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: profile } = await session.from("users").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await context.params;
  const db = getAdminClient() as any;
  const { data: batch, error: batchError } = await db.from("checkin_voucher_batches").select("id,terms").eq("id", id).single();
  if (batchError || !batch) return NextResponse.json({ error: "Batch not found" }, { status: 404 });
  await processVoucherBatch(db, id, batch.terms);
  const { data } = await db.from("checkin_voucher_batches").select("*").eq("id", id).single();
  return NextResponse.json(data);
}
