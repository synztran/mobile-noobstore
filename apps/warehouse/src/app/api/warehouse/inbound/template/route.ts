import { NextResponse } from "next/server";
import { requireWarehouseAdmin } from "@/lib/security/admin";
import { jsonError } from "@/lib/warehouse/guards";
import {
  generateInboundTemplateCsv,
  type InboundCatalogProduct,
} from "@/modules/warehouse/inbound";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireWarehouseAdmin();
  if (!auth.ok) {
    return jsonError(
      auth.status === 401 ? "Unauthorized" : "Forbidden",
      auth.status
    );
  }

  // Fetch active products and variants from canonical store database
  // Exclude kits because kit stock is derived from its required components
  const { data: rawProducts, error } = await auth.client
    .from("products")
    .select(
      "id, name, slug, product_type, stock_quantity, product_variants(id, variant_name, stock_quantity)"
    )
    .neq("product_type", "kit")
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error || !rawProducts) {
    return jsonError("Unable to fetch catalog products for template.", 500);
  }

  const catalog = rawProducts as unknown as InboundCatalogProduct[];
  const csv = generateInboundTemplateCsv(catalog);

  const timestamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="inbound-template-${timestamp}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
