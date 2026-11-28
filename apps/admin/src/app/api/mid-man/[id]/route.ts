import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { paymentAdmin } from "@/lib/payment-auth";
import { MID_MAN_STATUSES } from "@/lib/mid-man-workflow";

export const dynamic = "force-dynamic";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await paymentAdmin(req);
  if (auth.error) return auth.error;
  const { id } = await params;
  if (!uuid.test(id)) return NextResponse.json({ error: "Invalid case" }, { status: 400 });
  const db = getAdminClient();
  const [caseResult, auditResult] = await Promise.all([
    (db.from as any)("mid_man_cases").select("*").eq("id", id).maybeSingle(),
    (db.from as any)("mid_man_case_audit").select("*").eq("case_id", id).order("created_at"),
  ]);
  if (caseResult.error || auditResult.error) return NextResponse.json({ error: "Unable to load case" }, { status: 503 });
  if (!caseResult.data) return NextResponse.json({ error: "Case not found" }, { status: 404 });
  return NextResponse.json({ case: caseResult.data, audit: auditResult.data }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await paymentAdmin(req);
  if (auth.error) return auth.error;
  const { id } = await params;
  if (!uuid.test(id)) return NextResponse.json({ error: "Invalid case" }, { status: 400 });
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  if (typeof body.status !== "string" || !MID_MAN_STATUSES.includes(body.status as typeof MID_MAN_STATUSES[number]) || typeof (body.note ?? "") !== "string" || ((body.note as string).length > 1000)) return NextResponse.json({ error: "Invalid transition" }, { status: 400 });
  const { data, error } = await (getAdminClient().rpc as any)("transition_mid_man_case", { p_case_id: id, p_operator_id: auth.user!.id, p_to_status: body.status, p_note: body.note ?? "" });
  if (error) return NextResponse.json({ error: "Unable to transition case" }, { status: 503 });
  if (data?.[0]?.error_code) return NextResponse.json({ error: data[0].error_code }, { status: data[0].error_code === "MID_MAN_NOT_FOUND" ? 404 : 409 });
  return NextResponse.json({ status: data?.[0]?.current_status }, { headers: { "Cache-Control": "no-store" } });
}
