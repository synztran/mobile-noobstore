import { NextRequest, NextResponse } from "next/server";
import { paymentDetails } from "@/modules/payments/server/details";
import { issueEvidence, evidencePng, deliverEvidence } from "@/modules/payments/server/evidence";
import { getAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { after } from "next/server";
import { getApiLimiter, getRateLimitKey } from "@/lib/redis/ratelimit";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const limit = await getApiLimiter().limit(`payment-qr:${getRateLimitKey(req)}`);
    if (!limit.success) return NextResponse.json({ error: "Too many QR requests" }, { status: 429, headers: { "Retry-After": "60" } });
    const result = await paymentDetails((await params).id);
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
    if (!result.payload || !result.data.bank) return NextResponse.json({ error: "No payment QR available" }, { status: 409 });
    const evidence = await issueEvidence(result.data.orderId, result.data.orderNumber, result.data.amountDue, result.data.bank, result.payload);
    const session = await createClient();
    const { data: { user } } = await session.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { error } = await (getAdminClient().from as any)("payment_evidence_delivery").insert({
      evidence_id: evidence.id, channel: "customer_response", outcome: "prepared", actor_id: user.id,
    });
    if (error) throw new Error("Cannot audit QR response");
    after(async () => { try { await deliverEvidence(evidence); } catch { console.error("[payment-evidence] delivery unavailable", evidence.id); } });
    return new NextResponse(new Uint8Array(evidencePng(evidence)), { headers: {
      "Content-Type": "image/png", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff",
      "X-Payment-Evidence-ID": evidence.id, "X-Payment-Evidence-SHA256": evidence.png_sha256,
      "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
    } });
  } catch {
    return NextResponse.json({ error: "Payment QR temporarily unavailable" }, { status: 503 });
  }
}
