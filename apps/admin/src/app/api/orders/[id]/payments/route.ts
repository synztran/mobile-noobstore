import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { paymentAdmin } from "@/lib/payment-auth";
import { verifiedPaymentEffects } from "@/lib/verified-payment-effects";

export const dynamic = "force-dynamic";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await paymentAdmin(req);
  if (auth.error) return auth.error;
  const { id } = await params;
  if (!uuid.test(id)) return NextResponse.json({ error: "Invalid order" }, { status: 400 });
  const db = getAdminClient();
  const [receipts, banks] = await Promise.all([
    // New migration types must be regenerated with Supabase after deployment.
    (db.from as any)("order_payment_receipts").select("*").eq("order_id", id).order("verified_at"),
    db.from("payment_information").select("id, platform_name, account_number, account_name").eq("platform_type", "bank"),
  ]);
  if (receipts.error || banks.error) return NextResponse.json({ error: "Cannot load verified payments" }, { status: 503 });
  return NextResponse.json({ receipts: receipts.data, banks: banks.data }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await paymentAdmin(req);
  if (auth.error) return auth.error;
  const { id } = await params;
  if (!uuid.test(id)) return NextResponse.json({ error: "Invalid order" }, { status: 400 });
  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  if (!body || typeof body !== "object" || body.verified !== true ||
      typeof body.reference !== "string" || body.reference.length > 100 ||
      typeof body.note !== "string" || body.note.length > 1000 ||
      typeof body.receivedAt !== "string" || !Number.isFinite(Date.parse(body.receivedAt)) ||
      (body.reversalOf ? !uuid.test(body.reversalOf) :
        (!Number.isSafeInteger(body.amount) || body.amount <= 0 || !["bank", "cash", "cod"].includes(body.method))) ||
      (body.method === "bank" && !uuid.test(body.bankId ?? ""))) {
    return NextResponse.json({ error: "Valid receipt details and verification required" }, { status: 400 });
  }
  const db = getAdminClient();
  const { data, error } = await (db.rpc as any)("record_verified_order_payment", {
    p_order_id: id, p_admin_id: auth.user!.id, p_amount: body.reversalOf ? 0 : body.amount,
    p_method: body.method, p_receiving_account: body.bankId || null,
    p_reference: body.reference.trim().toUpperCase(), p_received_at: new Date(body.receivedAt).toISOString(),
    p_note: body.note.trim(), p_reversal_of: body.reversalOf || null,
  });
  if (error) {
    try { await (db.rpc as any)("queue_payment_security_alert", { p_kind: "payment_rejected", p_key: auth.user!.id }); }
    catch { console.error("[verified-payment] failed to queue rejected action"); }
    if (error.code === "23505") return NextResponse.json({ error: "Transaction reference or reversal already recorded. Refresh before retrying." }, { status: 409 });
    console.error("[verified-payment] rejected:", error.code);
    return NextResponse.json({ error: error.code === "P0001" ? error.message : "Unable to record payment" }, { status: error.code === "P0001" ? 400 : 503 });
  }
  if (data.status !== data.previous_status) {
    try { await verifiedPaymentEffects(id, data.status); }
    catch (error) { console.error("[verified-payment] notification failed after commit", error); }
  }
  return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
}
