import { NextRequest, NextResponse } from "next/server";
import { requireWarehouseAdmin } from "@/lib/security/admin";
import { createWarehouseServiceClient } from "@/lib/supabase/service";
import { jsonError, isSameOriginMutation, readJsonBody } from "@/lib/warehouse/guards";
import { listWarehouseProducts } from "@/lib/warehouse/service";
import type { WarehouseProductInput } from "@/modules/warehouse/types";

export const dynamic = "force-dynamic";

function productInput(value: unknown): WarehouseProductInput | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const v = value as Record<string, unknown>;
  if (typeof v.name !== "string" || !v.name.trim() || v.name.length > 200) return null;
  if (typeof v.slug !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v.slug)) return null;
  if (typeof v.base_price !== "number" || !Number.isFinite(v.base_price) || v.base_price < 0) return null;
  if (!Array.isArray(v.variants) || v.variants.length > 100) return null;
  const variants = v.variants.map((item) => {
    if (typeof item !== "object" || item === null || Array.isArray(item)) return null;
    const variant = item as Record<string, unknown>;
    if (typeof variant.variant_name !== "string" || !variant.variant_name.trim() || variant.variant_name.length > 200) return null;
    if (variant.price_adjustment !== null && (typeof variant.price_adjustment !== "number" || !Number.isFinite(variant.price_adjustment))) return null;
    if (typeof variant.initial_stock !== "number" || !Number.isInteger(variant.initial_stock) || variant.initial_stock < 0) return null;
    return { variant_name: variant.variant_name.trim(), price_adjustment: variant.price_adjustment as number | null, initial_stock: variant.initial_stock, attributes: (variant.attributes ?? null) as WarehouseProductInput["variants"][number]["attributes"] };
  });
  if (variants.some((variant) => variant === null)) return null;
  return {
    name: v.name.trim(), slug: v.slug, product_type: "standard", base_price: v.base_price,
    max_quantity: typeof v.max_quantity === "number" && Number.isInteger(v.max_quantity) && v.max_quantity >= 0 ? v.max_quantity : null,
    is_active: v.is_active === true, brand: typeof v.brand === "string" ? v.brand : null,
    description: typeof v.description === "string" ? v.description : null,
    thumbnail: typeof v.thumbnail === "string" ? v.thumbnail : null,
    images: (v.images ?? null) as WarehouseProductInput["images"],
    attributes: (v.attributes ?? null) as WarehouseProductInput["attributes"],
    category_id: typeof v.category_id === "string" ? v.category_id : null,
    is_used: typeof v.is_used === "boolean" ? v.is_used : null,
    is_pre_order: v.is_pre_order === true,
    initial_stock: Number.isInteger(v.initial_stock) && Number(v.initial_stock) >= 0 ? Number(v.initial_stock) : 0,
    variants: variants as NonNullable<typeof variants[number]>[],
  };
}

export async function GET(request: NextRequest) {
  const auth = await requireWarehouseAdmin();
  if (!auth.ok) return jsonError(auth.status === 401 ? "Unauthorized" : "Forbidden", auth.status);
  try {
    const products = await listWarehouseProducts(auth.client, request.nextUrl.searchParams.get("q") ?? "");
    return NextResponse.json(products, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return jsonError("Unable to load warehouse catalog.", 500);
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireWarehouseAdmin();
  if (!auth.ok) return jsonError(auth.status === 401 ? "Unauthorized" : "Forbidden", auth.status);
  if (!isSameOriginMutation(request)) return jsonError("Invalid request origin.", 403);
  try {
    const body = await readJsonBody(request);
    if (typeof body !== "object" || body === null || Array.isArray(body)) return jsonError("Invalid product.", 400);
    const product = productInput((body as Record<string, unknown>).product);
    if (!product) return jsonError("Check the product fields and variants.", 400);
    const serviceClient = createWarehouseServiceClient();
    const { data, error } = await serviceClient.rpc("warehouse_create_staged_product", {
      p_product: product as never,
      p_variants: product.variants as never,
      p_actor_id: auth.user.id,
    });
    if (error || !data) return jsonError("Unable to save warehouse product and variants atomically.", 400);
    return NextResponse.json({ success: true, id: data }, { status: 201, headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Invalid request.", 400);
  }
}
