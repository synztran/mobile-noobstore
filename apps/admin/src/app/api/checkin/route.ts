import { createClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { processVoucherBatch } from "@/lib/checkin-voucher-batches";

export const dynamic = "force-dynamic";

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
  const [settings, events, batches] = await Promise.all([
    db.from("checkin_settings").select("*").eq("id", true).single(),
    db.from("checkin_events").select("*").order("event_date", { ascending: false }).limit(100),
    db.from("checkin_voucher_batches").select("*").order("created_at", { ascending: false }).limit(50),
  ]);
  const error = settings.error ?? events.error ?? batches.error;
  if (error) return NextResponse.json({ error: "Unable to load check-in configuration" }, { status: 500 });
  return NextResponse.json({ settings: settings.data, events: events.data ?? [], batches: batches.data ?? [] }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function PATCH(request: NextRequest) {
  const auth = await authorize();
  if ("error" in auth) return auth.error;
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const allowed = ["enabled", "weekday_points", "weekend_points", "holiday_weekday_points", "holiday_weekend_points", "monthly_voucher_quantity", "monthly_voucher_terms"];
  const payload: Record<string, unknown> = {};
  for (const key of allowed) if (key in body) payload[key] = body[key];
  if (!Object.keys(payload).length || Object.entries(payload).some(([key, value]) => key === "enabled" ? typeof value !== "boolean" : key === "monthly_voucher_terms" ? !value || typeof value !== "object" : !Number.isInteger(value) || Number(value) < 0 || Number(value) > (key === "monthly_voucher_quantity" ? 1000 : 100))) {
    return NextResponse.json({ error: "Invalid check-in settings" }, { status: 400 });
  }
  const { error } = await (getAdminClient() as any).from("checkin_settings").update({ ...payload, updated_at: new Date().toISOString() }).eq("id", true);
  if (error) return NextResponse.json({ error: "Unable to save settings" }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function POST(request: NextRequest) {
  const auth = await authorize();
  if ("error" in auth) return auth.error;
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const eventDate = body.event_date;
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (typeof eventDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(eventDate) || !name || name.length > 100) return NextResponse.json({ error: "Invalid event date or name" }, { status: 400 });
  const payload = {
    event_date: eventDate, name, event_type: body.event_type === "holiday" ? "holiday" : "special",
    weekday_points: body.weekday_points == null ? null : Number(body.weekday_points),
    weekend_points: body.weekend_points == null ? null : Number(body.weekend_points),
    voucher_batch_id: typeof body.voucher_batch_id === "string" ? body.voucher_batch_id : null,
    voucher_quantity: Number(body.voucher_quantity ?? 0),
    enabled: body.enabled !== false,
  };
  if ([payload.weekday_points, payload.weekend_points].some((n) => n !== null && (!Number.isInteger(n) || n < 0 || n > 100)) || !Number.isInteger(payload.voucher_quantity) || payload.voucher_quantity < 0 || payload.voucher_quantity > 1000) return NextResponse.json({ error: "Points must be 0-100 and voucher quantity 0-1000" }, { status: 400 });
  const db = getAdminClient() as any;
  const { data, error } = await db.from("checkin_events").insert(payload).select("*").single();
  if (error) return NextResponse.json({ error: error.code === "23505" ? "Event already configured for that date" : "Unable to create event" }, { status: error.code === "23505" ? 409 : 500 });
  if (payload.voucher_quantity > 0) {
    const terms = body.voucher_terms && typeof body.voucher_terms === "object" ? body.voucher_terms : { name: `${name} voucher`, reward_type: "amount_off", amount_off: 30000, min_order_amount: 0, scope_type: "order_total" };
    const { data: batch, error: batchError } = await db.from("checkin_voucher_batches").insert({ name: `${name} ${eventDate}`, event_date: eventDate, requested_count: payload.voucher_quantity, terms, status: "pending", created_by: auth.user.id }).select("id").single();
    if (batchError) return NextResponse.json({ event: data, error: "Event saved but voucher batch creation failed" }, { status: 202 });
    const batchItems = Array.from({ length: payload.voucher_quantity }, (_, index) => ({ batch_id: batch.id, item_number: index + 1, status: "pending" }));
    for (let start = 0; start < batchItems.length; start += 100) {
      const { error: itemError } = await db.from("checkin_voucher_batch_items").upsert(batchItems.slice(start, start + 100), { onConflict: "batch_id,item_number", ignoreDuplicates: true });
      if (itemError) return NextResponse.json({ event: data, batchId: batch.id, error: "Event and voucher batch saved; item setup can be retried" }, { status: 202 });
    }
    const { error: linkError } = await db.from("checkin_events").update({ voucher_batch_id: batch.id }).eq("id", data.id);
    if (linkError) return NextResponse.json({ event: data, batchId: batch.id, error: "Event and batch created; linking requires retry" }, { status: 202 });
    const items = Array.from({ length: payload.voucher_quantity }, (_, index) => ({ batch_id: batch.id, item_number: index + 1, status: "pending" }));
    for (let start = 0; start < items.length; start += 100) {
      const { error: itemsError } = await db.from("checkin_voucher_batch_items").upsert(items.slice(start, start + 100), { onConflict: "batch_id,item_number", ignoreDuplicates: true });
      if (itemsError) return NextResponse.json({ event: data, batchId: batch.id, error: "Voucher batch item initialization failed" }, { status: 202 });
    }
    await processVoucherBatch(db, batch.id, terms);
  }
  return NextResponse.json(data, { status: 201 });
}
