import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { paymentAdmin } from "@/lib/payment-auth";
import { validateCase } from "@/lib/mid-man-workflow";

export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "private, no-store" };

export async function GET(req: NextRequest) {
  const auth = await paymentAdmin(req);
  if (auth.error) return auth.error;
  const { data, error } = await (getAdminClient().from as any)("mid_man_cases").select("*").order("created_at", { ascending: false }).limit(100);
  if (error) return NextResponse.json({ error: "Unable to load cases" }, { status: 503, headers: noStore });
  return NextResponse.json({ cases: data }, { headers: noStore });
}

export async function POST(req: NextRequest) {
  const auth = await paymentAdmin(req);
  if (auth.error) return auth.error;
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const invalid = validateCase(body);
  if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });
  const db = getAdminClient();
  const { data: id, error } = await (db.rpc as any)("create_mid_man_case", {
    p_party_a_name: body.party_a_name, p_party_a_contact: body.party_a_contact,
    p_party_b_name: body.party_b_name, p_party_b_contact: body.party_b_contact,
    p_agreed_terms: body.agreed_terms, p_amount: body.amount, p_operator_id: auth.user!.id,
  });
  if (error) return NextResponse.json({ error: "Unable to create case" }, { status: 503 });
  const { data: created, error: readError } = await (db.from as any)("mid_man_cases").select("*").eq("id", id).single();
  if (readError) return NextResponse.json({ error: "Case created but could not be loaded" }, { status: 503 });
  return NextResponse.json({ case: created }, { status: 201, headers: noStore });
}
