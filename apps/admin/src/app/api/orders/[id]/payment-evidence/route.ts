import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { getAdminClient } from "@/lib/supabase/admin";
import { paymentAdmin } from "@/lib/payment-auth";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await paymentAdmin(req);
  if (auth.error) return auth.error;
  const { id } = await params;
  const evidenceId = req.nextUrl.searchParams.get("evidence");
  const db = getAdminClient();
  if (evidenceId) {
    if (!/^[0-9a-f-]{36}$/i.test(evidenceId)) return NextResponse.json({ error: "Invalid evidence" }, { status: 400 });
    const { data, error } = await (db.from as any)("payment_instruction_evidence").select("png_base64, png_sha256").eq("order_id", id).eq("id", evidenceId).maybeSingle();
    if (error || !data) return NextResponse.json({ error: "Evidence unavailable" }, { status: 404 });
    const png = Buffer.from(data.png_base64, "base64");
    if (createHash("sha256").update(png).digest("hex") !== data.png_sha256) return NextResponse.json({ error: "Evidence integrity mismatch" }, { status: 503 });
    return new NextResponse(new Uint8Array(png), { headers: {
      "Content-Type": "image/png", "Content-Disposition": `attachment; filename="payment-${evidenceId}.png"`,
      "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff",
    } });
  }
  const { data, error } = await (db.from as any)("payment_instruction_evidence")
    .select("id, version, amount, reference, bank_identity, payload_sha256, png_sha256, created_at")
    .eq("order_id", id).order("version", { ascending: false });
  if (error) return NextResponse.json({ error: "Evidence unavailable" }, { status: 503 });
  return NextResponse.json({ evidence: data }, { headers: { "Cache-Control": "private, no-store" } });
}
