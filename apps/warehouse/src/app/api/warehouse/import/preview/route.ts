import { NextRequest, NextResponse } from "next/server";
import { requireWarehouseAdmin } from "@/lib/security/admin";
import { jsonError, isSameOriginMutation, readJsonBody } from "@/lib/warehouse/guards";
import { importWarehouseCsv } from "@/lib/warehouse/service";
import { parseWarehouseCsv, MAX_CSV_BYTES } from "@/modules/warehouse/csv";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const auth = await requireWarehouseAdmin();
  if (!auth.ok) return jsonError(auth.status === 401 ? "Unauthorized" : "Forbidden", auth.status);
  if (!isSameOriginMutation(request)) return jsonError("Invalid request origin.", 403);
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.startsWith("multipart/form-data")) {
    try {
      const form = await request.formData();
      const file = form.get("file");
      if (!(file instanceof File)) return jsonError("Choose a CSV file.", 400);
      if (file.size > MAX_CSV_BYTES) return jsonError("CSV file exceeds the 2 MB limit.", 413);
      if (!file.name.toLowerCase().endsWith(".csv")) return jsonError("Upload a .csv file.", 415);
      const csv = await file.text();
      if (csv.includes("\u0000")) return jsonError("CSV must be valid UTF-8 text.", 400);
      const preview = parseWarehouseCsv(csv);
      return NextResponse.json({ filename: file.name.slice(0, 255), preview, canCommit: preview.issues.length === 0 }, { headers: { "Cache-Control": "private, no-store" } });
    } catch {
      return jsonError("Unable to read CSV file.", 400);
    }
  }
  try {
    const body = await readJsonBody(request);
    if (typeof body !== "object" || body === null || Array.isArray(body)) return jsonError("Invalid import request.", 400);
    const value = body as Record<string, unknown>;
    if (value.action === "preview" && typeof value.csv === "string") {
      if (new TextEncoder().encode(value.csv).byteLength > MAX_CSV_BYTES) return jsonError("CSV file exceeds the 2 MB limit.", 413);
      return NextResponse.json({ filename: String(value.filename ?? "warehouse-import.csv").slice(0, 255), preview: parseWarehouseCsv(value.csv) }, { headers: { "Cache-Control": "private, no-store" } });
    }
    if (value.action !== "commit" || typeof value.csv !== "string") return jsonError("Invalid import action.", 400);
    const result = await importWarehouseCsv(auth.client, auth.user.id, String(value.filename ?? "warehouse-import.csv"), value.csv);
    if (!result.imported) return jsonError("CSV contains invalid rows; correct the preview errors before import.", 422);
    return NextResponse.json(result, { status: 201, headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Unable to import CSV.", 400);
  }
}
