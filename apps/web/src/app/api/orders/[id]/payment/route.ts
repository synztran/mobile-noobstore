import { NextRequest, NextResponse } from "next/server";
import { paymentDetails } from "@/modules/payments/server/details";
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const result = await paymentDetails((await params).id);
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json(result.data, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "Payment details temporarily unavailable" }, { status: 503 });
  }
}
