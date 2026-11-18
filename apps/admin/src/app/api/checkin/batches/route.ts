import { createClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { processVoucherBatch } from "@/lib/checkin-voucher-batches";

export const dynamic = "force-dynamic";
const MAX_BATCH = 1000;

async function authorize() {
  const session = await createClient();
  const { data: { user }, error } = await session.auth.getUser();
  if (error || !user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const { data: profile } = await session.from("users").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  return { user };
}

export async function GET() {
  const auth = await authorize();
  if ("error" in auth) return auth.error;
  const db = getAdminClient() as any;
  const { data, error } = await db.from("checkin_voucher_batches").select("*,items:checkin_voucher_batch_items(*)").order("created_at", { ascending: false }).limit(50);
  if (error) return NextResponse.json({ error: "Unable to load batches" }, { status: 500 });
  return NextResponse.json(data ?? [], { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: NextRequest) {
  const auth = await authorize();
  if ("error" in auth) return auth.error;
  let body: Record<string, any>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const quantity = Number(body.quantity);
  const terms = body.terms;
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_BATCH || !terms || typeof terms !== "object") return NextResponse.json({ error: `Quantity must be 1-${MAX_BATCH}; voucher terms required` }, { status: 400 });
  if (!terms.name || typeof terms.name !== "string" || !terms.reward_type || !["amount_off", "percent_off", "free_shipping", "gift_item"].includes(terms.reward_type)) return NextResponse.json({ error: "Invalid voucher terms" }, { status: 400 });
  if (terms.reward_type === "amount_off" && (!Number.isFinite(Number(terms.amount_off)) || Number(terms.amount_off) <= 0)) return NextResponse.json({ error: "Invalid discount amount" }, { status: 400 });
  if (terms.reward_type === "percent_off" && (!Number.isFinite(Number(terms.percent_off)) || Number(terms.percent_off) <= 0 || Number(terms.percent_off) > 100)) return NextResponse.json({ error: "Invalid discount percent" }, { status: 400 });
  const db = getAdminClient() as any;
  const { data: batch, error } = await db.from("checkin_voucher_batches").insert({ name: terms.name, event_date: body.event_date ?? null, month_start: body.month_start ?? null, requested_count: quantity, status: "processing", terms, created_by: auth.user.id }).select("id").single();
  if (error) return NextResponse.json({ error: "Unable to create voucher batch" }, { status: 500 });
  for (let start = 0; start < quantity; start += 100) {
    const items = Array.from({ length: Math.min(100, quantity - start) }, (_, offset) => ({ batch_id: batch.id, item_number: start + offset + 1, status: "pending" }));
    const { error: itemError } = await db.from("checkin_voucher_batch_items").upsert(items, { onConflict: "batch_id,item_number", ignoreDuplicates: true });
    if (itemError) return NextResponse.json({ batchId: batch.id, error: "Batch recorded; item initialization failed. Retry batch." }, { status: 202 });
  }
  await processVoucherBatch(db, batch.id, terms);
  const { data: result } = await db.from("checkin_voucher_batches").select("*").eq("id", batch.id).single();
  return NextResponse.json(result, { status: 201 });
}
