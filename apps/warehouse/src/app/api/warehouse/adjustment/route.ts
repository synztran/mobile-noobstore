import { NextRequest, NextResponse } from "next/server";
import { requireWarehouseAdmin } from "@/lib/security/admin";
import {
  jsonError,
  isSameOriginMutation,
  readJsonBody,
} from "@/lib/warehouse/guards";
import {
  parseAdjustmentCsv,
  generateAdjustmentTemplateCsv,
  type AdjustmentCatalogProduct,
} from "@/modules/warehouse/adjustment";

export const dynamic = "force-dynamic";

const MAX_CSV_BYTES = 2 * 1024 * 1024;

async function fetchCatalog(client: any): Promise<AdjustmentCatalogProduct[]> {
  const { data } = await client
    .from("products")
    .select("id, name, slug, product_type, stock_quantity, product_variants(id, variant_name, stock_quantity)")
    .neq("product_type", "kit")
    .order("name", { ascending: true });
  return (data ?? []) as AdjustmentCatalogProduct[];
}

export async function GET() {
  const auth = await requireWarehouseAdmin();
  if (!auth.ok) return jsonError(auth.status === 401 ? "Unauthorized" : "Forbidden", auth.status);

  const catalog = await fetchCatalog(auth.client);
  const csv = generateAdjustmentTemplateCsv(catalog);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="stock-adjustment-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireWarehouseAdmin();
  if (!auth.ok) return jsonError(auth.status === 401 ? "Unauthorized" : "Forbidden", auth.status);
  if (!isSameOriginMutation(request)) return jsonError("Invalid request origin.", 403);

  const contentType = request.headers.get("content-type") ?? "";

  // Multipart: preview
  if (contentType.startsWith("multipart/form-data")) {
    try {
      const form = await request.formData();
      const file = form.get("file");
      if (!(file instanceof File)) return jsonError("Choose a CSV file.", 400);
      if (file.size > MAX_CSV_BYTES) return jsonError("CSV file exceeds the 2 MB limit.", 413);
      if (!file.name.toLowerCase().endsWith(".csv")) return jsonError("Upload a .csv file.", 415);

      const csv = await file.text();
      const catalog = await fetchCatalog(auth.client);
      const preview = parseAdjustmentCsv(csv, catalog);

      return NextResponse.json(
        { filename: file.name.slice(0, 255), preview, canCommit: preview.issues.length === 0 && preview.items.length > 0 },
        { headers: { "Cache-Control": "private, no-store" } }
      );
    } catch {
      return jsonError("Unable to read CSV file.", 400);
    }
  }

  // JSON: commit
  try {
    const body = await readJsonBody(request);
    if (typeof body !== "object" || body === null || Array.isArray(body)) return jsonError("Invalid request body.", 400);

    const payload = body as Record<string, unknown>;
    const action = payload.action;
    const csv = typeof payload.csv === "string" ? payload.csv : "";
    const filename = String(payload.filename ?? "adjustment.csv").slice(0, 255);
    const note = typeof payload.note === "string" ? payload.note.slice(0, 500) : null;

    if (!csv) return jsonError("CSV content is required.", 400);
    if (new TextEncoder().encode(csv).byteLength > MAX_CSV_BYTES) return jsonError("CSV file exceeds the 2 MB limit.", 413);

    const catalog = await fetchCatalog(auth.client);
    const preview = parseAdjustmentCsv(csv, catalog);

    if (action === "preview") {
      return NextResponse.json({ filename, preview, canCommit: preview.issues.length === 0 && preview.items.length > 0 });
    }

    if (action !== "commit") return jsonError('Action must be "preview" or "commit".', 400);

    if (preview.issues.length > 0) return jsonError("CSV contains validation errors; fix errors before submitting.", 422);
    if (preview.items.length === 0) return jsonError("No adjustment items found in the CSV.", 400);

    const operationId = crypto.randomUUID();

    const { error: opError } = await (auth.client.from as any)("warehouse_sync_operations").insert({
      operation_id: operationId,
      actor_id: auth.user.id,
      request_payload: {
        type: "stock_adjustment",
        filename,
        note,
        created_at: new Date().toISOString(),
        created_by_email: auth.user.email ?? "warehouse",
        item_count: preview.items.length,
        // net total (may be negative)
        total_quantity: preview.items.reduce((s, i) => s + i.adjustment_quantity, 0),
        items: preview.items,
      },
      completed_at: null,
    });

    if (opError) {
      console.error("[adjustment] Failed to record operation:", opError);
      return jsonError("Failed to save adjustment batch.", 500);
    }

    return NextResponse.json(
      {
        success: true,
        operation_id: operationId,
        filename,
        item_count: preview.items.length,
        status: "pending_approval",
      },
      { status: 201 }
    );
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "Unable to process adjustment.", 500);
  }
}
