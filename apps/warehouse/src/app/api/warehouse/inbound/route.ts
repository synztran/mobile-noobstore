import { NextRequest, NextResponse } from "next/server";
import { requireWarehouseAdmin } from "@/lib/security/admin";
import {
  jsonError,
  isSameOriginMutation,
  readJsonBody,
} from "@/lib/warehouse/guards";
import {
  parseInboundCsv,
  type InboundCatalogProduct,
} from "@/modules/warehouse/inbound";

export const dynamic = "force-dynamic";

const MAX_CSV_BYTES = 2 * 1024 * 1024;

async function fetchCatalogForInbound(client: any) {
  const { data: rawProducts } = await client
    .from("products")
    .select(
      "id, name, slug, product_type, stock_quantity, product_variants(id, variant_name, stock_quantity)"
    )
    .neq("product_type", "kit")
    .order("name", { ascending: true });

  return (rawProducts ?? []) as InboundCatalogProduct[];
}

export async function GET() {
  const auth = await requireWarehouseAdmin();
  if (!auth.ok) {
    return jsonError(
      auth.status === 401 ? "Unauthorized" : "Forbidden",
      auth.status
    );
  }

  // List recent inbound operations
  const { data: operations, error } = await auth.client
    .from("warehouse_sync_operations")
    .select(
      "operation_id, request_payload, response_payload, created_at, completed_at, actor_id"
    )
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return jsonError("Unable to fetch inbound batches.", 500);
  }

  const inboundBatches = (operations ?? [])
    .filter((op: any) => op.request_payload?.type === "inbound_batch")
    .map((op: any) => ({
      operation_id: op.operation_id,
      filename: op.request_payload?.filename ?? "inbound.csv",
      note: op.request_payload?.note ?? null,
      item_count: op.request_payload?.item_count ?? 0,
      total_quantity: op.request_payload?.total_quantity ?? 0,
      created_at: op.created_at,
      created_by: op.request_payload?.created_by_email ?? op.actor_id,
      completed_at: op.completed_at,
      status: op.completed_at ? "applied" : "pending_approval",
    }));

  return NextResponse.json({ batches: inboundBatches });
}

export async function POST(request: NextRequest) {
  const auth = await requireWarehouseAdmin();
  if (!auth.ok) {
    return jsonError(
      auth.status === 401 ? "Unauthorized" : "Forbidden",
      auth.status
    );
  }

  if (!isSameOriginMutation(request)) {
    return jsonError("Invalid request origin.", 403);
  }

  const contentType = request.headers.get("content-type") ?? "";

  // 1. Multipart form upload (Preview)
  if (contentType.startsWith("multipart/form-data")) {
    try {
      const form = await request.formData();
      const file = form.get("file");
      if (!(file instanceof File)) return jsonError("Choose a CSV file.", 400);
      if (file.size > MAX_CSV_BYTES) {
        return jsonError("CSV file exceeds the 2 MB limit.", 413);
      }
      if (!file.name.toLowerCase().endsWith(".csv")) {
        return jsonError("Upload a .csv file.", 415);
      }

      const csv = await file.text();
      const catalog = await fetchCatalogForInbound(auth.client);
      const preview = parseInboundCsv(csv, catalog);

      return NextResponse.json(
        {
          filename: file.name.slice(0, 255),
          preview,
          canCommit: preview.issues.length === 0 && preview.items.length > 0,
        },
        { headers: { "Cache-Control": "private, no-store" } }
      );
    } catch {
      return jsonError("Unable to read CSV file.", 400);
    }
  }

  // 2. JSON Body (Commit batch)
  try {
    const body = await readJsonBody(request);
    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      return jsonError("Invalid request body.", 400);
    }

    const payload = body as Record<string, unknown>;
    const action = payload.action;
    const csv = typeof payload.csv === "string" ? payload.csv : "";
    const filename = String(payload.filename ?? "inbound.csv").slice(0, 255);
    const note =
      typeof payload.note === "string" ? payload.note.slice(0, 500) : null;

    if (!csv) return jsonError("CSV content is required.", 400);
    if (new TextEncoder().encode(csv).byteLength > MAX_CSV_BYTES) {
      return jsonError("CSV file exceeds the 2 MB limit.", 413);
    }

    const catalog = await fetchCatalogForInbound(auth.client);
    const preview = parseInboundCsv(csv, catalog);

    if (action === "preview") {
      return NextResponse.json({
        filename,
        preview,
        canCommit: preview.issues.length === 0 && preview.items.length > 0,
      });
    }

    if (action !== "commit") {
      return jsonError('Action must be "preview" or "commit".', 400);
    }

    if (preview.issues.length > 0) {
      return jsonError(
        "CSV contains validation errors; fix errors before submitting.",
        422
      );
    }

    if (preview.items.length === 0) {
      return jsonError(
        "No items with inbound quantity > 0 found in the CSV.",
        400
      );
    }

    const operationId = crypto.randomUUID();

    // Insert into warehouse_sync_operations with completed_at = null (pending Admin apply)
    const { error: opError } = await (auth.client.from as any)(
      "warehouse_sync_operations"
    ).insert({
      operation_id: operationId,
      actor_id: auth.user.id,
      request_payload: {
        type: "inbound_batch",
        filename,
        note,
        created_at: new Date().toISOString(),
        created_by_email: auth.user.email ?? "warehouse",
        item_count: preview.items.length,
        total_quantity: preview.totalQuantity,
        items: preview.items,
      },
      completed_at: null,
    });

    if (opError) {
      console.error("[inbound] Failed to record sync operation:", opError);
      return jsonError("Failed to save inbound batch.", 500);
    }

    // Insert into warehouse_import_batches for batch history tracking
    await (auth.client.from as any)("warehouse_import_batches").insert({
      id: operationId,
      filename,
      row_count: preview.rowCount,
      product_count: preview.items.length,
      imported_by: auth.user.id,
    });

    return NextResponse.json(
      {
        success: true,
        operation_id: operationId,
        filename,
        item_count: preview.items.length,
        total_quantity: preview.totalQuantity,
        status: "pending_approval",
        message:
          "Inbound batch submitted successfully! Awaiting Admin review in /inventory.",
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[inbound] Unexpected error:", err);
    return jsonError(
      err instanceof Error ? err.message : "Unable to process inbound batch.",
      500
    );
  }
}
