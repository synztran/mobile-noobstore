import { NextResponse } from "next/server";
import { warehouseCsvTemplate } from "@/modules/warehouse/csv";
import { requireWarehouseAdmin } from "@/lib/security/admin";
import { jsonError } from "@/lib/warehouse/guards";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireWarehouseAdmin();
  if (!auth.ok) return jsonError(auth.status === 401 ? "Unauthorized" : "Forbidden", auth.status);
  return new NextResponse(warehouseCsvTemplate(), { headers: {
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": 'attachment; filename="warehouse-template-v1.csv"',
    "Cache-Control": "private, no-store",
  } });
}
