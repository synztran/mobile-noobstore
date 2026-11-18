import "server-only";

import { createHash, randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { WarehouseDatabase } from "@/lib/supabase/database.types";
import type { WarehouseProduct, WarehouseProductInput } from "@/modules/warehouse/types";
import type { JsonValue } from "@/modules/warehouse/types";
import { parseWarehouseCsv, serializeWarehouseCsv } from "@/modules/warehouse/csv";

type Client = SupabaseClient<WarehouseDatabase>;
type ProductRow = Omit<WarehouseProduct, "variants"> & { variants?: unknown };

const CATALOG_SELECT = "id, admin_product_id, name, slug, product_type, base_price, max_quantity, is_active, brand, description, thumbnail, images, attributes, category_id, is_used, is_pre_order, stock_quantity, sync_status, sync_baseline, admin_version, local_revision, created_at, updated_at, warehouse_product_variants(id, admin_variant_id, variant_name, price_adjustment, attributes, initial_stock)";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function mapRow(value: unknown): WarehouseProduct {
  if (!isObject(value)) throw new Error("Invalid warehouse product returned by database.");
  const row = value as unknown as ProductRow & { warehouse_product_variants?: unknown };
  const variantRows = Array.isArray(row.warehouse_product_variants) ? row.warehouse_product_variants : [];
  return {
    id: row.id,
    admin_product_id: row.admin_product_id,
    name: row.name,
    slug: row.slug,
    product_type: (row as any).product_type || "standard",
    base_price: row.base_price,
    max_quantity: row.max_quantity,
    is_active: row.is_active,
    brand: row.brand,
    description: row.description,
    thumbnail: row.thumbnail,
    images: row.images as JsonValue | null,
    attributes: row.attributes as JsonValue | null,
    category_id: row.category_id,
    is_used: row.is_used,
    is_pre_order: row.is_pre_order,
    initial_stock: 0,
    stock_quantity: (row as any).stock_quantity ?? 0,
    sync_status: (row as any).sync_status ?? null,
    variants: variantRows.map((entry) => {
      if (!isObject(entry)) throw new Error("Invalid warehouse variant returned by database.");
      return {
        id: String(entry.id),
        variant_name: String(entry.variant_name),
        price_adjustment: typeof entry.price_adjustment === "number" ? entry.price_adjustment : null,
        attributes: (entry.attributes as JsonValue | null) ?? null,
        initial_stock: Number(entry.initial_stock ?? 0),
        admin_variant_id: typeof entry.admin_variant_id === "string" ? entry.admin_variant_id : null,
      };
    }),
    sync_baseline: (row.sync_baseline as JsonValue | null) ?? null,
    admin_version: row.admin_version,
    local_revision: row.local_revision,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function listWarehouseProducts(client: Client, query = ""): Promise<WarehouseProduct[]> {
  let request = client.from("warehouse_products").select(CATALOG_SELECT).order("updated_at", { ascending: false }).limit(1000);
  if (query.trim()) request = request.ilike("name", `%${query.trim().replace(/[,%()]/g, "").slice(0, 80)}%`);
  const { data, error } = await request;
  if (error) throw new Error("Unable to load warehouse products.");
  return (data ?? []).map(mapRow);
}

export async function getWarehouseProduct(client: Client, id: string): Promise<WarehouseProduct | null> {
  const { data, error } = await client.from("warehouse_products").select(CATALOG_SELECT).eq("id", id).maybeSingle();
  if (error) throw new Error("Unable to load warehouse product.");
  return data ? mapRow(data) : null;
}

export async function importWarehouseCsv(client: Client, actorId: string, filename: string, csv: string) {
  if (new TextEncoder().encode(csv).byteLength > 2 * 1024 * 1024) throw new Error("CSV file exceeds the 2 MB limit.");
  const preview = parseWarehouseCsv(csv);
  if (preview.issues.length > 0) return { preview, imported: false };
  const products = preview.products.map((product) => ({
    ...product,
    variants: product.variants.map((variant) => ({
      variant_name: variant.variant_name,
      price_adjustment: variant.price_adjustment,
      attributes: variant.attributes,
      initial_stock: variant.initial_stock,
    })),
  }));
  const serviceClient = (await import("@/lib/supabase/service")).createWarehouseServiceClient();
  const { data, error } = await serviceClient.rpc("warehouse_import_batch", {
    p_filename: filename.slice(0, 255),
    p_products: products as unknown as WarehouseDatabase["public"]["Functions"]["warehouse_import_batch"]["Args"]["p_products"],
    p_actor_id: actorId,
  });
  if (error) throw new Error("Import failed; no rows were committed.");
  return { preview, imported: true, batch: data };
}

export async function exportWarehouseCsv(client: Client): Promise<string> {
  const products = await listWarehouseProducts(client);
  return serializeWarehouseCsv(products);
}

export function canonicalSnapshot(product: WarehouseProductInput): string {
  const normalize = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(normalize);
    if (isObject(value)) return Object.fromEntries(Object.keys(value).sort().map((key) => [key, normalize(value[key])]));
    return value;
  };
  const snapshot = {
    name: product.name,
    slug: product.slug,
    product_type: product.product_type,
    base_price: product.base_price,
    max_quantity: product.max_quantity,
    is_active: product.is_active,
    brand: product.brand,
    description: product.description,
    thumbnail: product.thumbnail,
    images: product.images,
    attributes: product.attributes,
    category_id: product.category_id,
    is_used: product.is_used,
    is_pre_order: product.is_pre_order,
    variants: [...product.variants]
      .map(({ variant_name, price_adjustment, attributes }) => ({ variant_name, price_adjustment, attributes }))
      .sort((a, b) => a.variant_name.localeCompare(b.variant_name)),
  };
  return createHash("sha256").update(JSON.stringify(normalize(snapshot))).digest("hex");
}

export async function pushProductToAdmin(
  product: WarehouseProduct,
  accessToken: string,
  adminOrigin: string,
  operationId = randomUUID(),
) {
  const endpoint = new URL("/api/warehouse-sync", adminOrigin);
  if (endpoint.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(endpoint.hostname)) throw new Error("Admin sync origin must use HTTPS outside local development.");
  const requestProduct = {
    name: product.name,
    slug: product.slug,
    product_type: "standard",
    base_price: product.base_price,
    max_quantity: product.max_quantity,
    is_active: product.is_active,
    brand: product.brand,
    description: product.description,
    thumbnail: product.thumbnail,
    images: product.images,
    attributes: product.attributes,
    category_id: product.category_id,
    is_used: product.is_used,
    is_pre_order: product.is_pre_order,
    initial_stock: product.admin_product_id ? 0 : product.initial_stock,
    admin_product_id: product.admin_product_id ?? undefined,
    admin_version: product.admin_version ?? undefined,
    variants: product.variants.map((variant) => ({
      variant_name: variant.variant_name,
      price_adjustment: variant.price_adjustment,
      attributes: variant.attributes,
      admin_variant_id: variant.admin_variant_id ?? undefined,
      warehouse_variant_id: "id" in variant && typeof variant.id === "string" ? variant.id : undefined,
      initial_stock: product.admin_product_id ? 0 : variant.initial_stock,
    })),
  };
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ operation_id: operationId, action: product.admin_product_id ? "update" : "create", product: requestProduct }),
    cache: "no-store",
  });
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok || !isObject(payload)) throw new Error(isObject(payload) && typeof payload.error === "string" ? payload.error : "Admin sync request failed.");
  return payload;
}

export async function recordSyncEvent(
  client: Client,
  actorId: string,
  product: WarehouseProduct,
  direction: "publish" | "pull",
  outcome: "created" | "updated" | "unchanged" | "conflict" | "failed",
  operationId: string,
  safeMessage: string | null,
) {
  const { error } = await client.from("warehouse_sync_events").insert({
    warehouse_product_id: product.id,
    admin_product_id: product.admin_product_id,
    direction,
    outcome,
    operation_id: operationId,
    actor_id: actorId,
    safe_message: safeMessage?.slice(0, 500) ?? null,
  });
  if (error) throw new Error("Sync result could not be recorded; inspect canonical product state before retrying.");
}

export async function syncHistory(client: Client, productId?: string) {
  let query = client.from("warehouse_sync_events").select("id, warehouse_product_id, admin_product_id, direction, outcome, operation_id, actor_id, safe_message, occurred_at").order("occurred_at", { ascending: false }).limit(200);
  if (productId) query = query.eq("warehouse_product_id", productId);
  const { data, error } = await query;
  if (error) throw new Error("Unable to load sync history.");
  return data ?? [];
}

export async function updateWarehouseProduct(client: Client, actorId: string, id: string, input: WarehouseProductInput) {
  const { variants, initial_stock: _initialStock, warehouse_id: _warehouseId, admin_product_id: _adminProductId, ...fields } = input;
  const { product_type: _productType, ...stagedFields } = fields;
  const revision = (input as WarehouseProductInput & { local_revision?: number }).local_revision;
  let update = client.from("warehouse_products").update({ ...stagedFields, updated_by: actorId }).eq("id", id);
  if (typeof revision === "number") update = update.eq("local_revision", revision);
  const { data: updatedProduct, error } = await update.select("id").maybeSingle();
  if (error) throw new Error("Unable to update warehouse product.");
  if (!updatedProduct) throw new Error("Product changed while you were editing; reload and retry.");
  const { error: deleteError } = await client.from("warehouse_product_variants").delete().eq("warehouse_product_id", id);
  if (deleteError) throw new Error("Unable to replace warehouse variants.");
  if (variants.length > 0) {
    const { error: insertError } = await client.from("warehouse_product_variants").insert(variants.map((variant) => ({
      warehouse_product_id: id,
      variant_name: variant.variant_name,
      price_adjustment: variant.price_adjustment,
      attributes: variant.attributes as WarehouseDatabase["public"]["Tables"]["warehouse_product_variants"]["Insert"]["attributes"],
      initial_stock: variant.initial_stock,
      admin_variant_id: variant.admin_variant_id ?? null,
    })));
    if (insertError) throw new Error("Unable to save warehouse variants.");
  }
}

export async function pullAllFromAdmin(client: Client, actorId: string) {
  // 1. Fetch all products and their variants from canonical store database
  const { data: canonicalProducts, error: prodErr } = await (client as any)
    .from("products")
    .select(
      "id, name, slug, product_type, base_price, max_quantity, is_active, brand, description, thumbnail, images, attributes, category_id, is_used, is_pre_order, stock_quantity, updated_at, parent_product_id, product_variants(id, variant_name, price_adjustment, attributes, stock_quantity)"
    )
    .order("name", { ascending: true });

  if (prodErr || !canonicalProducts) {
    throw new Error(
      `Failed to fetch canonical products: ${prodErr?.message ?? "unknown error"}`
    );
  }

  // 2. Fetch existing warehouse products to match by admin_product_id or slug
  const { data: existingWhProducts } = await client
    .from("warehouse_products")
    .select("id, admin_product_id, slug, admin_version, local_revision");

  const byAdminId = new Map<string, any>();
  const bySlug = new Map<string, any>();
  for (const wh of (existingWhProducts ?? []) as any[]) {
    if (wh.admin_product_id) byAdminId.set(wh.admin_product_id, wh);
    if (wh.slug) bySlug.set(wh.slug, wh);
  }

  let createdCount = 0;
  let updatedCount = 0;

  for (const prod of canonicalProducts as any[]) {
    const existing = byAdminId.get(prod.id) ?? bySlug.get(prod.slug);

    const variants = (prod.product_variants ?? []).map((v: any) => ({
      variant_name: v.variant_name,
      price_adjustment: v.price_adjustment,
      attributes: v.attributes,
      admin_variant_id: v.id,
      initial_stock: v.stock_quantity ?? 0,
    }));

    const baselineHash = canonicalSnapshot({
      name: prod.name,
      slug: prod.slug,
      product_type: prod.product_type || "standard",
      base_price: Number(prod.base_price || 0),
      max_quantity: prod.max_quantity,
      is_active: prod.is_active ?? false,
      brand: prod.brand,
      description: prod.description,
      thumbnail: prod.thumbnail,
      images: prod.images,
      attributes: prod.attributes,
      category_id: prod.category_id,
      is_used: prod.is_used,
      is_pre_order: prod.is_pre_order ?? false,
      initial_stock: prod.stock_quantity ?? 0,
      variants,
    });

    if (existing) {
      // Update existing staging record
      const { error: updErr } = await (client as any)
        .from("warehouse_products")
        .update({
          name: prod.name,
          slug: prod.slug,
          product_type: prod.product_type || "standard",
          base_price: prod.base_price,
          max_quantity: prod.max_quantity,
          is_active: prod.is_active,
          brand: prod.brand,
          description: prod.description,
          thumbnail: prod.thumbnail,
          images: prod.images,
          attributes: prod.attributes,
          category_id: prod.category_id,
          admin_category_id: prod.category_id,
          parent_product_id: prod.parent_product_id,
          is_used: prod.is_used,
          is_pre_order: prod.is_pre_order,
          stock_quantity: prod.stock_quantity,
          admin_product_id: prod.id,
          admin_version: prod.updated_at,
          sync_baseline: baselineHash,
          sync_status: "linked",
          updated_by: actorId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);

      if (updErr) {
        console.error(`[pull-all] Failed to update product ${prod.slug}:`, updErr);
        continue;
      }

      // Sync variants
      if (variants.length > 0) {
        const { data: existingVars } = await client
          .from("warehouse_product_variants")
          .select("id, admin_variant_id, variant_name")
          .eq("warehouse_product_id", existing.id);

        const varByAdminId = new Map<string, any>();
        const varByName = new Map<string, any>();
        for (const ev of (existingVars ?? []) as any[]) {
          if (ev.admin_variant_id) varByAdminId.set(ev.admin_variant_id, ev);
          if (ev.variant_name) varByName.set(ev.variant_name.toLowerCase(), ev);
        }

        for (const v of variants) {
          const matchedVar =
            (v.admin_variant_id && varByAdminId.get(v.admin_variant_id)) ||
            varByName.get(v.variant_name.toLowerCase());

          if (matchedVar) {
            await (client as any)
              .from("warehouse_product_variants")
              .update({
                variant_name: v.variant_name,
                price_adjustment: v.price_adjustment,
                attributes: v.attributes,
                admin_variant_id: v.admin_variant_id,
                initial_stock: v.initial_stock,
                updated_at: new Date().toISOString(),
              })
              .eq("id", matchedVar.id);
          } else {
            await (client as any)
              .from("warehouse_product_variants")
              .insert({
                warehouse_product_id: existing.id,
                variant_name: v.variant_name,
                price_adjustment: v.price_adjustment,
                attributes: v.attributes,
                admin_variant_id: v.admin_variant_id,
                initial_stock: v.initial_stock,
              });
          }
        }
      }
      updatedCount++;
    } else {
      // Create new warehouse_products row
      const whId = crypto.randomUUID();
      const { error: insErr } = await (client as any)
        .from("warehouse_products")
        .insert({
          id: whId,
          admin_product_id: prod.id,
          name: prod.name,
          slug: prod.slug,
          product_type: prod.product_type || "standard",
          base_price: prod.base_price,
          max_quantity: prod.max_quantity,
          is_active: prod.is_active,
          brand: prod.brand,
          description: prod.description,
          thumbnail: prod.thumbnail,
          images: prod.images,
          attributes: prod.attributes,
          category_id: prod.category_id,
          admin_category_id: prod.category_id,
          parent_product_id: prod.parent_product_id,
          is_used: prod.is_used,
          is_pre_order: prod.is_pre_order,
          stock_quantity: prod.stock_quantity,
          initial_stock: prod.stock_quantity ?? 0,
          admin_version: prod.updated_at,
          sync_baseline: baselineHash,
          sync_status: "linked",
          created_by: actorId,
          updated_by: actorId,
        });

      if (insErr) {
        console.error(`[pull-all] Failed to insert product ${prod.slug}:`, insErr);
        continue;
      }

      if (variants.length > 0) {
        await (client as any)
          .from("warehouse_product_variants")
          .insert(
            variants.map((v: any) => ({
              warehouse_product_id: whId,
              variant_name: v.variant_name,
              price_adjustment: v.price_adjustment,
              attributes: v.attributes,
              admin_variant_id: v.admin_variant_id,
              initial_stock: v.initial_stock,
            }))
          );
      }
      createdCount++;
    }
  }

  return {
    total: canonicalProducts.length,
    created: createdCount,
    updated: updatedCount,
  };
}
