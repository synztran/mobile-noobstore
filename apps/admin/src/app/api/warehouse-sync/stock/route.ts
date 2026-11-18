import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { invalidateProductCaches } from "@/lib/redis/cache";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get("authorization")?.match(/^Bearer (\S+)$/)?.[1];
    if (!token || token.length > 8192) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const client = getAdminClient();
    const { data: { user }, error } = await client.auth.getUser(token);
    if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { data: profile } = await client.from("users").select("role").eq("id", user.id).maybeSingle();
    if (profile?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const raw = await request.text();
    if (raw.length > 4096) return NextResponse.json({ error: "Payload too large" }, { status: 413 });
    let body;
    try { body = JSON.parse(raw); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
    if (!body || typeof body !== "object" || !/^[0-9a-f-]{36}$/i.test(body.productId ?? "")
      || typeof body.variantId !== "string" || body.variantId.length > 64
      || !Number.isInteger(body.expected) || body.expected < 0 || body.expected > 2147483646
      || ![-1, 1].includes(body.delta) || typeof body.reason !== "string"
      || !body.reason.trim() || body.reason.length > 300) {
      return NextResponse.json({ error: "Invalid stock adjustment" }, { status: 400 });
    }
    // Migration 160 contract; generated DB types are refreshed after deployment.
    // Note: use (client.rpc as any)(...) not extracted variable — extracted method loses `this` binding.
    let data: { stock_quantity: number } | null;
    let adjustmentError: unknown;
    try {
      ({ data, error: adjustmentError } = await (client.rpc as any)("warehouse_adjust_variant_stock", {
        p_warehouse_product_id: body.productId, p_variant_id: body.variantId,
        p_expected: body.expected, p_delta: body.delta, p_reason: body.reason, p_actor_id: user.id,
      }));
    } catch (rpcErr) {
      const detail = rpcErr instanceof Error ? rpcErr.message : String(rpcErr);
      console.error("[warehouse-sync/stock] RPC threw:", detail);
      return NextResponse.json({ error: `RPC failed: ${detail}` }, { status: 502 });
    }
    if (adjustmentError) {
      const errMsg = typeof adjustmentError === "object" && adjustmentError !== null && "message" in adjustmentError
        ? String((adjustmentError as { message: string }).message)
        : "Adjustment rejected";
      console.error("[warehouse-sync/stock] adjustmentError:", adjustmentError);
      return NextResponse.json({ error: `${errMsg}. Refresh stock and check the variant link; ensure migration 160 is deployed.` }, { status: 409 });
    }
    let warning: string | undefined;
    try { await invalidateProductCaches(); } catch { warning = "Stock saved; cache refresh failed. Do not repeat the adjustment."; }
    return NextResponse.json({ ...data, warning }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error("[warehouse-sync/stock] Fatal error:", detail);
    return NextResponse.json({ error: `Admin internal error: ${detail}` }, { status: 500 });
  }
}
