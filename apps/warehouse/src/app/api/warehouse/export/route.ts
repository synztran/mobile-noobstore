import { NextRequest, NextResponse } from "next/server";
import { requireWarehouseAdmin } from "@/lib/security/admin";
import { jsonError, isSameOriginMutation } from "@/lib/warehouse/guards";
import { exportWarehouseCsv } from "@/lib/warehouse/service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireWarehouseAdmin();
  if (!auth.ok) return jsonError(auth.status === 401 ? "Unauthorized" : "Forbidden", auth.status);
  try {
    const csv = await exportWarehouseCsv(auth.client);
    return new NextResponse(csv, { headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="warehouse-catalog-v1.csv"',
      "Cache-Control": "private, no-store",
    } });
  } catch {
    return jsonError("Unable to export warehouse catalog.", 500);
  }
}

export async function POST(request: NextRequest) {
  if (!isSameOriginMutation(request)) return jsonError("Invalid request origin.", 403);
  return jsonError("Use GET to download the warehouse CSV export.", 405);
}
