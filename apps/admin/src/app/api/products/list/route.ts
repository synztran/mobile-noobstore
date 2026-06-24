import { getAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const q = sp.get("q") ?? "";
  const productType = sp.get("productType") ?? "";
  const page = Math.max(1, parseInt(sp.get("page") ?? "1", 10));
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const allowedProductTypes = new Set(["standard", "kit", "component"]);
  const selectedProductType = allowedProductTypes.has(productType)
    ? productType
    : undefined;

  const supabase = getAdminClient();

  let query = supabase
    .from("products")
    .select(
      `
      id, name, slug, base_price, stock_quantity, product_type, brand, description, is_used, thumbnail,
      categories(id, name),
      product_variants(id, variant_name, price_adjustment, stock_quantity, is_pre_order, attributes),
      product_components!product_components_parent_product_id_fkey(
        id, component_group, is_required, max_quantity,
        component_product:products!product_components_component_product_id_fkey(
          id, name, thumbnail,
          product_variants(id, variant_name, price_adjustment, stock_quantity, is_pre_order, attributes)
        )
      )
    `,
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (q) query = query.ilike("name", `%${q}%`);
  if (selectedProductType) query = query.eq("product_type", selectedProductType);

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    products: data ?? [],
    count: count ?? 0,
    page,
    totalPages: Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE)),
  });
}
