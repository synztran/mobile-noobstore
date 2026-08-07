import { isInStock } from "@/lib/product-utils";
import { getAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const q = sp.get("q") ?? "";
  const idsParam = sp.get("ids") ?? "";
  const productType = sp.get("productType") ?? "";
  const excludeSoldOut = sp.get("excludeSoldOut") === "true";
  const page = Math.max(1, parseInt(sp.get("page") ?? "1", 10));
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const ids = idsParam
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  const allowedProductTypes = new Set(["standard", "kit", "component", "gift", "all"]);
  const selectedProductType = allowedProductTypes.has(productType) && productType !== "all"
    ? productType
    : undefined;

  const supabase = getAdminClient();

  let query = supabase
    .from("products")
    .select(
      `
      id, name, slug, base_price, stock_quantity, max_quantity, product_type, brand, description, is_used, thumbnail, attributes, is_active, parent_product_id, category_id,
      categories(id, name),
      product_variants(id, variant_name, price_adjustment, stock_quantity, is_pre_order, pre_order_config),
      product_components!product_components_parent_product_id_fkey(
        id, component_group, is_required, max_quantity,
        component_product:products!product_components_component_product_id_fkey(
          id, name, thumbnail,
          product_variants(id, variant_name, price_adjustment, stock_quantity, is_pre_order, pre_order_config)
        )
      )
    `,
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (q) query = query.ilike("name", `%${q}%`);
  if (selectedProductType) query = query.eq("product_type", selectedProductType);
  if (ids.length > 0) query = query.in("id", ids);

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let products = data ?? [];
  if (excludeSoldOut) {
    products = products.filter((p) => isInStock(p));
  }

  return NextResponse.json({
    products,
    count: excludeSoldOut ? products.length : (count ?? 0),
    page,
    totalPages: Math.max(1, Math.ceil((excludeSoldOut ? products.length : count ?? 0) / PAGE_SIZE)),
  });
}
