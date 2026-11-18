import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { requireWarehouseAdmin } from "@/lib/security/admin";
import { jsonError, isSameOriginMutation, readJsonBody } from "@/lib/warehouse/guards";
import { canonicalSnapshot, getWarehouseProduct, listWarehouseProducts, pushProductToAdmin, recordSyncEvent } from "@/lib/warehouse/service";
import { createClient } from "@/lib/supabase/server";
import type { WarehouseProduct, WarehouseProductInput } from "@/modules/warehouse/types";

export const dynamic = "force-dynamic";

function isWarehouseProductInput(value: unknown): value is WarehouseProductInput {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    && typeof (value as WarehouseProductInput).name === "string"
    && typeof (value as WarehouseProductInput).slug === "string"
    && Array.isArray((value as WarehouseProductInput).variants);
}

export async function POST(request: NextRequest) {
  const auth = await requireWarehouseAdmin();
  if (!auth.ok) return jsonError(auth.status === 401 ? "Unauthorized" : "Forbidden", auth.status);
  if (!isSameOriginMutation(request)) return jsonError("Invalid request origin.", 403);
  try {
    const body = await readJsonBody(request);
    if (typeof body !== "object" || body === null || Array.isArray(body)) return jsonError("Invalid sync request.", 400);
    const payload = body as Record<string, unknown>;
    const action = payload.action;
    if (action !== "publish" && action !== "pull" && action !== "resolve-admin" && action !== "resolve-warehouse") return jsonError("Unsupported sync action.", 400);
    const proposedWarehouse = payload.product;
    if (action === "resolve-warehouse" && !isWarehouseProductInput(proposedWarehouse)) return jsonError("Reload the conflict screen and choose the warehouse version again.", 400);
    const ids = Array.isArray(payload.ids) ? payload.ids.filter((id): id is string => typeof id === "string" && id.length <= 64).slice(0, 50) : [];
    if (ids.length === 0) return jsonError("Select at least one product.", 400);
    const localProducts = await listWarehouseProducts(auth.client);
    const results: Array<{ id: string; outcome: string; message?: string; canonicalId?: string }> = [];
    const syncClient = await createClient();
    const { data: { session } } = await syncClient.auth.getSession();
    const accessToken = session?.access_token;
    if (!accessToken) return jsonError("Your session expired. Sign in again.", 401);
    const adminOrigin = process.env.ADMIN_APP_ORIGIN;
    if (!adminOrigin) return jsonError("Admin sync origin is not configured.", 503);

    for (const id of [...new Set(ids)]) {
      const product = localProducts.find((item) => item.id === id);
      if (!product) { results.push({ id, outcome: "failed", message: "Product not found." }); continue; }
      const operationId = randomUUID();
      try {
        if (action === "pull") {
          if (!product.admin_product_id) {
            await recordSyncEvent(auth.client, auth.user.id, product, "pull", "failed", operationId, "Product has not been published.");
            results.push({ id, outcome: "failed", message: "Product has not been published." });
            continue;
          }
          const currentHash = canonicalSnapshot(product);
          const baseline = typeof product.sync_baseline === "string" ? product.sync_baseline : null;
          if (baseline && currentHash !== baseline) {
            await recordSyncEvent(auth.client, auth.user.id, product, "pull", "conflict", operationId, "Warehouse has local edits; resolve the conflict explicitly.");
            results.push({ id, outcome: "conflict", message: "Warehouse has local edits; resolve the conflict explicitly." });
            continue;
          }
          const response = await fetch(new URL(`/api/warehouse-sync?ids=${encodeURIComponent(product.admin_product_id)}`, adminOrigin), {
            headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store",
          });
          const data: unknown = await response.json().catch(() => null);
          if (!response.ok || typeof data !== "object" || data === null || !Array.isArray((data as { products?: unknown }).products)) throw new Error("Unable to fetch canonical Admin product.");
          const remote = (data as { products: Array<Record<string, unknown>> }).products[0];
          if (!remote) throw new Error(
            "Không tìm thấy sản phẩm trên Admin (admin_product_id không tồn tại hoặc sản phẩm là kit — chỉ kit mới không hỗ trợ sync). " +
            "Vào trang chi tiết sản phẩm → xóa liên kết Admin ID → Publish lại để tạo mới."
          );
          const { data: currentWarehouse } = await auth.client.from("warehouse_products").select("admin_version, local_revision").eq("id", product.id).maybeSingle();
          if (!currentWarehouse || currentWarehouse.local_revision !== product.local_revision || currentWarehouse.admin_version !== product.admin_version) {
            await recordSyncEvent(auth.client, auth.user.id, product, "pull", "conflict", operationId, "Warehouse record changed while pull was being reviewed.");
            results.push({ id, outcome: "conflict", message: "Warehouse record changed while pull was being reviewed." });
            continue;
          }
          const pulledBaseline = canonicalSnapshot({ ...product, ...remote, variants: product.variants });
          const { data: pulled, error: updateError } = await auth.client.from("warehouse_products").update({
            name: remote.name as string,
            slug: remote.slug as string,
            base_price: remote.base_price as number,
            max_quantity: remote.max_quantity as number | null,
            is_active: remote.is_active as boolean,
            brand: remote.brand as string | null,
            description: remote.description as string | null,
            thumbnail: remote.thumbnail as string | null,
            images: remote.images as never,
            attributes: remote.attributes as never,
            category_id: remote.category_id as string | null,
            is_used: remote.is_used as boolean | null,
            is_pre_order: remote.is_pre_order as boolean,
            sync_baseline: pulledBaseline,
            admin_version: remote.updated_at as string,
            updated_by: auth.user.id,
          }).eq("id", product.id).eq("local_revision", product.local_revision).eq("admin_version", product.admin_version ?? "").select("id").maybeSingle();
          if (updateError || !pulled) throw new Error("Warehouse record changed during pull; reload and retry.");
          await recordSyncEvent(auth.client, auth.user.id, product, "pull", "updated", operationId, null);
          results.push({ id, outcome: "updated" });
          continue;
        }

        const baseline = typeof product.sync_baseline === "string" ? product.sync_baseline : null;
        if (product.admin_product_id && baseline && canonicalSnapshot(product) !== baseline && action !== "resolve-warehouse") {
          await recordSyncEvent(auth.client, auth.user.id, product, "publish", "conflict", operationId, "Warehouse changed since the last sync; choose an explicit resolution direction.");
          results.push({ id, outcome: "conflict", message: "Warehouse changed since the last sync; choose an explicit resolution direction." });
          continue;
        }
        if (product.admin_product_id && (action === "resolve-admin" || action === "resolve-warehouse")) {
          const response = await fetch(new URL(`/api/warehouse-sync?ids=${encodeURIComponent(product.admin_product_id)}`, adminOrigin), { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" });
          const data: unknown = await response.json().catch(() => null);
          if (!response.ok || typeof data !== "object" || data === null || !Array.isArray((data as { products?: unknown }).products)) throw new Error("Unable to fetch canonical Admin product.");
          const remote = (data as { products: Array<Record<string, unknown>> }).products[0];
          if (!remote) throw new Error(
            "Không tìm thấy sản phẩm trên Admin (admin_product_id không tồn tại hoặc sản phẩm là kit — chỉ kit mới không hỗ trợ sync). " +
            "Vào trang chi tiết sản phẩm → xóa liên kết Admin ID → Publish lại để tạo mới."
          );
          if (action === "resolve-admin") {
            const { data: currentWarehouse } = await auth.client.from("warehouse_products").select("admin_version, local_revision").eq("id", product.id).maybeSingle();
            if (!currentWarehouse || currentWarehouse.admin_version !== product.admin_version || currentWarehouse.local_revision !== product.local_revision) {
              await recordSyncEvent(auth.client, auth.user.id, product, "pull", "conflict", operationId, "Warehouse record changed while resolving; reload and compare again.");
              results.push({ id, outcome: "conflict", message: "Warehouse record changed while resolving; reload and compare again." });
              continue;
            }
            const resolvedBaseline = canonicalSnapshot({ ...product, ...remote, variants: product.variants });
            const { data: resolved, error: updateError } = await auth.client.from("warehouse_products").update({
              name: remote.name as string, slug: remote.slug as string, base_price: remote.base_price as number,
              max_quantity: remote.max_quantity as number | null, is_active: remote.is_active as boolean,
              brand: remote.brand as string | null, description: remote.description as string | null,
              thumbnail: remote.thumbnail as string | null, images: remote.images as never,
              attributes: remote.attributes as never, category_id: remote.category_id as string | null,
              is_used: remote.is_used as boolean | null, is_pre_order: remote.is_pre_order as boolean,
              sync_baseline: resolvedBaseline,
              admin_version: remote.updated_at as string, updated_by: auth.user.id,
            }).eq("id", product.id).eq("local_revision", product.local_revision).eq("admin_version", product.admin_version ?? "").select("id").maybeSingle();
            if (updateError || !resolved) throw new Error("Warehouse record changed while resolving; reload and compare again.");
            const updated = await getWarehouseProduct(auth.client, product.id);
            if (!updated) throw new Error("Unable to reload resolved warehouse product.");
            const canonicalBaseline = canonicalSnapshot({ ...updated, variants: updated.variants });
            const { data: baselineSaved, error: baselineError } = await auth.client.from("warehouse_products").update({ sync_baseline: canonicalBaseline, admin_version: remote.updated_at as string, updated_by: auth.user.id }).eq("id", product.id).eq("local_revision", updated.local_revision).select("id").maybeSingle();
            if (baselineError || !baselineSaved) throw new Error("Admin data was applied, but its sync baseline could not be saved.");
            await recordSyncEvent(auth.client, auth.user.id, product, "pull", "updated", operationId, "Conflict resolved using Admin data.");
            results.push({ id, outcome: "updated", message: "Conflict resolved using Admin data." });
            continue;
          }
          if (remote.updated_at !== product.admin_version) {
            await recordSyncEvent(auth.client, auth.user.id, product, "publish", "conflict", operationId, "Admin product changed after the conflict screen loaded; refresh and choose again.");
            results.push({ id, outcome: "conflict", message: "Admin product changed after the conflict screen loaded; refresh and choose again." });
            continue;
          }
        }

        const productForSync = action === "resolve-warehouse" && isWarehouseProductInput(proposedWarehouse)
          ? { ...product, ...proposedWarehouse, id: product.id, admin_product_id: product.admin_product_id, sync_baseline: product.sync_baseline, admin_version: product.admin_version, local_revision: product.local_revision, created_at: product.created_at, updated_at: product.updated_at }
          : product;
        if (action === "resolve-warehouse") {
          const latest = await fetch(new URL(`/api/warehouse-sync?ids=${encodeURIComponent(product.admin_product_id ?? "")}`, adminOrigin), { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" });
          const latestPayload: unknown = await latest.json().catch(() => null);
          const remote = typeof latestPayload === "object" && latestPayload !== null && Array.isArray((latestPayload as { products?: unknown }).products) ? (latestPayload as { products: Array<Record<string, unknown>> }).products[0] : undefined;
          if (!latest.ok || !remote || remote.updated_at !== product.admin_version) {
            await recordSyncEvent(auth.client, auth.user.id, product, "publish", "conflict", operationId, "Admin changed after the conflict screen loaded; refresh and compare again.");
            results.push({ id, outcome: "conflict", message: "Admin changed after the conflict screen loaded; refresh and compare again." });
            continue;
          }
        }
        const result = await pushProductToAdmin(productForSync, accessToken, adminOrigin, operationId);
        const canonicalId = typeof result.id === "string" ? result.id : product.admin_product_id;
        const { data: currentWarehouse } = await auth.client.from("warehouse_products").select("local_revision, admin_version").eq("id", product.id).maybeSingle();
        if (!currentWarehouse || currentWarehouse.local_revision !== product.local_revision || currentWarehouse.admin_version !== product.admin_version) {
          await recordSyncEvent(auth.client, auth.user.id, product, "publish", "conflict", operationId, "Warehouse record changed while publish was running; compare again before publishing.");
          results.push({ id, outcome: "conflict", message: "Warehouse record changed while publish was running; compare again before publishing." });
          continue;
        }
        const baselineValue = canonicalSnapshot(productForSync);
        const { data: linked, error: linkError } = await auth.client.from("warehouse_products").update({
          admin_product_id: canonicalId,
          sync_baseline: baselineValue,
          admin_version: typeof result.updated_at === "string" ? result.updated_at : new Date().toISOString(),
          updated_by: auth.user.id,
        }).eq("id", product.id).eq("local_revision", product.local_revision).eq("admin_version", product.admin_version ?? "").select("id").maybeSingle();
        if (linkError || !linked) throw new Error("Admin sync succeeded, but warehouse link could not be saved. Inspect before retrying.");
        if (Array.isArray(result.variants)) {
          for (const mapping of result.variants) {
            if (typeof mapping !== "object" || mapping === null) continue;
            const pair = mapping as Record<string, unknown>;
            if (typeof pair.warehouse_variant_id !== "string" || typeof pair.admin_variant_id !== "string") continue;
            const { error: variantLinkError } = await auth.client.from("warehouse_product_variants").update({ admin_variant_id: pair.admin_variant_id }).eq("id", pair.warehouse_variant_id).eq("warehouse_product_id", product.id);
            if (variantLinkError) throw new Error("Admin sync succeeded, but variant links could not be saved. Inspect before retrying.");
          }
        }
        const outcome = product.admin_product_id ? "updated" : "created";
        await recordSyncEvent(auth.client, auth.user.id, { ...product, admin_product_id: canonicalId ?? null }, "publish", outcome, operationId, null);
        results.push({ id, outcome, canonicalId: canonicalId ?? undefined });
      } catch (error) {
        const message = error instanceof Error ? error.message.slice(0, 400) : "Sync failed.";
        try { await recordSyncEvent(auth.client, auth.user.id, product, action === "pull" ? "pull" : "publish", "failed", operationId, message); } catch { /* report persistence uncertainty to caller */ }
        results.push({ id, outcome: "failed", message });
      }
    }
    return NextResponse.json({ results }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Unable to sync selected products.", 400);
  }
}
