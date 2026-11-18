import { NextRequest, NextResponse } from "next/server";
import { requireWarehouseAdmin } from "@/lib/security/admin";
import { isSameOriginMutation, jsonError, readJsonBody } from "@/lib/warehouse/guards";

export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: Context) {
  const auth = await requireWarehouseAdmin();
  if (!auth.ok) return jsonError("Unauthorized", auth.status);
  const { id } = await context.params;
  const { data: product } = await auth.client.from("warehouse_products").select("admin_product_id").eq("id", id).maybeSingle();
  if (!product?.admin_product_id) return jsonError("Existing linked product required.", 404);
  const { data: links, error: linkError } = await auth.client.from("warehouse_product_variants").select("admin_variant_id").eq("warehouse_product_id", id);
  const linkedIds = (links ?? []).flatMap((v) => v.admin_variant_id ? [v.admin_variant_id] : []);
  const { data, error } = await auth.client.from("products").select("product_type, product_variants(id, variant_name, stock_quantity)").eq("id", product.admin_product_id).maybeSingle();
  if (error || linkError) return jsonError("Unable to load live stock.", 500);
  if (!data || !["standard", "component"].includes(data.product_type)) return jsonError("Existing non-kit product required.", 404);
  return NextResponse.json({ variants: (data.product_variants ?? []).filter((v: { id: string }) => linkedIds.includes(v.id)) }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: NextRequest, context: Context) {
  const auth = await requireWarehouseAdmin();
  if (!auth.ok) return jsonError("Unauthorized", auth.status);
  if (!isSameOriginMutation(request)) return jsonError("Invalid request origin.", 403);
  const origin = process.env.ADMIN_APP_ORIGIN;
  if (!origin) return jsonError("Admin sync origin is not configured.", 503);
  try {
    const body = await readJsonBody(request);
    if (!body || typeof body !== "object" || Array.isArray(body)) return jsonError("Invalid adjustment.", 400);
    const { id } = await context.params;
    const { data: { session } } = await auth.client.auth.getSession();
    if (!session) return jsonError("Sign in again.", 401);
    const response = await fetch(new URL("/api/warehouse-sync/stock", origin), {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ ...body, productId: id }), cache: "no-store", redirect: "error",
      signal: AbortSignal.timeout(15000),
    });
    const resBody = await response.json().catch(() => null);
    if (!response.ok) {
      const msg = resBody?.error || `Admin returned status ${response.status}`;
      return jsonError(msg, response.status);
    }
    return NextResponse.json(resBody, { status: response.status, headers: { "Cache-Control": "private, no-store" } });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error("[warehouse-stock-adjust] Error:", detail);
    return jsonError(`Unable to confirm adjustment (${detail}). Refresh live stock before retrying.`, 502);
  }
}
