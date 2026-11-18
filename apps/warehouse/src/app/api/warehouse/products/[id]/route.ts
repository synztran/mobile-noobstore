import { NextRequest, NextResponse } from "next/server";
import { requireWarehouseAdmin } from "@/lib/security/admin";
import { jsonError, isSameOriginMutation, readJsonBody } from "@/lib/warehouse/guards";
import { getWarehouseProduct, updateWarehouseProduct } from "@/lib/warehouse/service";
import type { WarehouseProductInput } from "@/modules/warehouse/types";

export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: Context) {
  const auth = await requireWarehouseAdmin();
  if (!auth.ok) return jsonError(auth.status === 401 ? "Unauthorized" : "Forbidden", auth.status);
  const { id } = await context.params;
  try {
    const product = await getWarehouseProduct(auth.client, id);
    return product
      ? NextResponse.json(product, { headers: { "Cache-Control": "private, no-store" } })
      : jsonError("Warehouse product not found.", 404);
  } catch {
    return jsonError("Unable to load warehouse product.", 500);
  }
}

export async function PATCH(request: NextRequest, context: Context) {
  const auth = await requireWarehouseAdmin();
  if (!auth.ok) return jsonError(auth.status === 401 ? "Unauthorized" : "Forbidden", auth.status);
  if (!isSameOriginMutation(request)) return jsonError("Invalid request origin.", 403);
  const { id } = await context.params;
  try {
    const existing = await getWarehouseProduct(auth.client, id);
    if (!existing) return jsonError("Warehouse product not found.", 404);
    const body = await readJsonBody(request);
    if (typeof body !== "object" || body === null || Array.isArray(body)) return jsonError("Invalid product.", 400);
    const value = body as Record<string, unknown>;
    if (value.admin_product_id !== undefined || value.admin_version !== undefined || value.initial_stock !== undefined) return jsonError("Canonical links and initial stock cannot be changed here.", 400);
    if (value.local_revision !== existing.local_revision) return jsonError("Product changed while you were editing. Reload the latest version and try again.", 409);
    if (typeof value.name !== "string" || !value.name.trim() || value.name.length > 200 || typeof value.slug !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.slug) || typeof value.base_price !== "number" || !Number.isFinite(value.base_price) || value.base_price < 0 || !Array.isArray(value.variants) || value.variants.length > 100) return jsonError("Check product fields and variants.", 400);
    const names = new Set<string>();
    for (const variant of value.variants) {
      if (typeof variant !== "object" || variant === null || Array.isArray(variant)) return jsonError("Invalid variant.", 400);
      const item = variant as Record<string, unknown>;
      if (typeof item.variant_name !== "string" || !item.variant_name.trim() || item.variant_name.length > 200 || (item.price_adjustment !== null && (typeof item.price_adjustment !== "number" || !Number.isFinite(item.price_adjustment))) || typeof item.initial_stock !== "number" || !Number.isInteger(item.initial_stock) || item.initial_stock < 0 || (item.admin_variant_id !== undefined && item.admin_variant_id !== null && typeof item.admin_variant_id !== "string")) return jsonError("Check variant names, adjustments and initial quantities.", 400);
      const normalizedName = item.variant_name.trim().toLowerCase();
      if (names.has(normalizedName)) return jsonError("Variant names must be unique for this product.", 400);
      names.add(normalizedName);
      if (item.admin_variant_id !== undefined && item.admin_variant_id !== null && !existing.variants.some((current) => current.admin_variant_id === item.admin_variant_id)) return jsonError("Variant Admin links cannot be changed here.", 400);
      if (typeof item.id === "string" && !existing.variants.some((current) => current.id === item.id)) return jsonError("Variant IDs cannot be changed here.", 400);
    }
    const input = { ...existing, ...value, product_type: "standard", variants: value.variants } as unknown as WarehouseProductInput;
    await updateWarehouseProduct(auth.client, auth.user.id, id, input);
    return NextResponse.json({ success: true }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Unable to update product.", 400);
  }
}
