import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminClient } from "@/lib/supabase/admin";
import { invalidateProductCaches } from "@/lib/redis/cache";
import { sanitizeHtml } from "@/lib/sanitize";

export const dynamic = "force-dynamic";
const productSchema = z.object({
  name: z.string().trim().min(1).max(200),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  product_type: z.literal("standard"),
  base_price: z.number().finite().nonnegative(),
  initial_stock: z.number().int().nonnegative().max(1_000_000).optional(),
  max_quantity: z.number().int().nonnegative().nullable().optional(),
  is_active: z.boolean().optional(), brand: z.string().max(200).nullable().optional(),
  description: z.string().max(100_000).nullable().optional(), thumbnail: z.string().max(2048).nullable().optional(),
  images: z.unknown().nullable().optional(), attributes: z.unknown().nullable().optional(),
  category_id: z.string().max(64).nullable().optional(), is_used: z.boolean().nullable().optional(),
  is_pre_order: z.boolean().optional(), admin_product_id: z.string().max(64).optional(),
  admin_version: z.string().max(100).optional(),
  variants: z.array(z.object({
    variant_name: z.string().trim().min(1).max(200), price_adjustment: z.number().finite().nullable(),
    attributes: z.unknown().nullable().optional(), is_pre_order: z.boolean().optional(),
    thumbnail: z.string().max(2048).nullable().optional(), initial_stock: z.number().int().nonnegative().max(1_000_000).optional(),
    admin_variant_id: z.string().max(64).nullable().optional(), warehouse_variant_id: z.string().uuid().optional(),
  }).strict()).max(100),
}).strict();
const PRODUCT_FIELDS = ["name", "slug", "product_type", "base_price", "stock_quantity", "max_quantity", "is_active", "brand", "description", "thumbnail", "images", "attributes", "category_id", "is_used", "is_pre_order"] as const;
const VARIANT_FIELDS = ["variant_name", "price_adjustment", "stock_quantity", "attributes", "is_pre_order", "thumbnail", "product_name"] as const;

async function authorize(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return null;
  const token = authorization.slice(7).trim();
  if (!token || token.length > 8192) return null;
  const supabase = getAdminClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return null;
  const { data: profile, error } = await supabase.from("users").select("role").eq("id", user.id).maybeSingle();
  if (error || profile?.role !== "admin") return null;
  return { supabase, user };
}

function responseError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "private, no-store" } });
}

export async function GET(request: NextRequest) {
  const auth = await authorize(request);
  if (!auth) return responseError("Unauthorized", 401);
  const ids = (request.nextUrl.searchParams.get("ids") ?? "").split(",").filter(Boolean).slice(0, 50);
  if (!ids.length || ids.some((id) => id.length > 64)) return responseError("Provide between 1 and 50 product IDs.", 400);
  const { data, error } = await auth.supabase.from("products").select("id, name, slug, product_type, base_price, stock_quantity, max_quantity, is_active, brand, description, thumbnail, images, attributes, category_id, is_used, is_pre_order, updated_at, product_variants(id, variant_name, price_adjustment, stock_quantity, attributes, is_pre_order, thumbnail, product_name, updated_at)").in("id", ids).neq("product_type", "kit");
  if (error) return responseError("Unable to read canonical products.", 500);
  return NextResponse.json({ products: data ?? [] }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: NextRequest) {
  const auth = await authorize(request);
  if (!auth) return responseError("Unauthorized", 401);
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 1024 * 1024) return responseError("Request body too large.", 413);
  let body: unknown;
  try { body = await request.json(); } catch { return responseError("Invalid JSON body.", 400); }
  if (typeof body !== "object" || body === null || Array.isArray(body)) return responseError("Invalid sync payload.", 400);
  const payload = body as Record<string, unknown>;
  if (typeof payload.operation_id !== "string" || !/^[0-9a-f-]{36}$/i.test(payload.operation_id)) return responseError("Invalid operation ID.", 400);
  if (payload.action !== "create" && payload.action !== "update") return responseError("Invalid sync action.", 400);
  if (typeof payload.product !== "object" || payload.product === null || Array.isArray(payload.product)) return responseError("Invalid product.", 400);
  const parsed = productSchema.safeParse(payload.product);
  if (!parsed.success) return responseError("Invalid product fields or variants.", 400);
  const input = parsed.data;
  const variants = input.variants;
  if (payload.action === "update" && typeof input.admin_product_id !== "string") return responseError("Update requires the linked canonical product ID.", 400);

  if (payload.action === "create") {
    const product: Record<string, unknown> = { ...input, description: typeof input.description === "string" ? sanitizeHtml(input.description) : input.description };
    const cleanVariants = variants.map((variant) => ({
      variant_name: variant.variant_name,
      price_adjustment: variant.price_adjustment,
      attributes: variant.attributes ?? null,
      is_pre_order: variant.is_pre_order ?? false,
      initial_stock: variant.initial_stock ?? 0,
      warehouse_variant_id: variant.warehouse_variant_id ?? null,
    }));
    const { data, error } = await auth.supabase.rpc("warehouse_admin_create_product", {
      p_operation_id: payload.operation_id,
      p_product: product as never,
      p_variants: cleanVariants as never,
      p_actor_id: auth.user.id,
    });
    if (error || typeof data !== "object" || data === null) return responseError("Product creation failed atomically.", 400);
    const result = data as Record<string, unknown>;
    if (result.idempotent === true) return NextResponse.json(data, { headers: { "Cache-Control": "private, no-store" } });
    await invalidateProductCaches();
    return NextResponse.json(data, { status: 201, headers: { "Cache-Control": "private, no-store" } });
  }

  const productId = String(input.admin_product_id);
  const expectedUpdatedAt = String(input.admin_version ?? "");
  const { data: current, error: currentError } = await auth.supabase.from("products").select("id, product_type, updated_at").eq("id", productId).maybeSingle();
  if (currentError || !current || current.product_type === "kit") return responseError("Canonical product was not found or is a kit (unsupported).", 404);
  if (!expectedUpdatedAt || current.updated_at !== expectedUpdatedAt) return responseError("conflict: canonical product has changed.", 409);
  const productPatch = Object.fromEntries(PRODUCT_FIELDS.filter((field) => !["stock_quantity", "product_type"].includes(field)).map((field) => [field, input[field]])) as Record<string, unknown>;
  for (const field of ["is_active", "brand", "description", "thumbnail", "images", "attributes", "category_id", "is_used", "is_pre_order"]) if (!(field in input)) delete productPatch[field];
  if (typeof productPatch.description === "string") productPatch.description = sanitizeHtml(productPatch.description);
  const { data: updatedProduct, error: updateError } = await auth.supabase.from("products").update(productPatch).eq("id", productId).eq("updated_at", expectedUpdatedAt).select("id").maybeSingle();
  if (updateError || !updatedProduct) return responseError("conflict: canonical product changed during the update.", 409);
  const { data: existingVariants, error: variantLoadError } = await auth.supabase.from("product_variants").select("id").eq("product_id", productId);
  if (variantLoadError) return responseError("Canonical product changed but variants could not be loaded; reconcile before retry.", 500);
  const allowedVariantIds = new Set((existingVariants ?? []).map((variant) => variant.id));
  const variantMappings: Array<{ warehouse_variant_id: string; admin_variant_id: string }> = [];
  for (const value of variants) {
    const variant = value as Record<string, unknown>;
    const variantId = typeof variant.admin_variant_id === "string" ? variant.admin_variant_id : null;
    if (!variantId || !allowedVariantIds.has(variantId)) return responseError("Variant mapping is stale or invalid.", 409);
    const patch = Object.fromEntries(VARIANT_FIELDS.filter((field) => !["stock_quantity", "product_name"].includes(field)).map((field) => [field, variant[field]])) as Record<string, unknown>;
    for (const field of ["attributes", "is_pre_order", "thumbnail"]) if (!(field in variant)) delete patch[field];
    const { error: variantError } = await auth.supabase.from("product_variants").update(patch).eq("id", variantId).eq("product_id", productId);
    if (variantError) return responseError("Product updated but a variant could not be updated; reconcile before retry.", 500);
    if (typeof variant.warehouse_variant_id === "string") variantMappings.push({ warehouse_variant_id: variant.warehouse_variant_id, admin_variant_id: variantId });
  }
  await invalidateProductCaches();
  const { data: latest } = await auth.supabase.from("products").select("updated_at").eq("id", productId).maybeSingle();
  return NextResponse.json({ id: productId, updated_at: latest?.updated_at ?? current.updated_at, variants: variantMappings }, { headers: { "Cache-Control": "private, no-store" } });
}
