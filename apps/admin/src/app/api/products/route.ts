import { getAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const productType = sp.get("productType");
  const supabase = getAdminClient();

  let query = supabase
    .from("products")
    .select(
      `id, name, slug, product_type, base_price, stock_quantity,
			 product_variants(id, variant_name, stock_quantity, price_adjustment),
			 product_components!product_components_parent_product_id_fkey(
			   id, component_group, is_required,
			   products!product_components_component_product_id_fkey(id, name, slug)
			 )`
    )
    .order("name");

  if (productType) {
    query = query.eq("product_type", productType);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("products")
    .insert(body)
    .select("id")
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ id: data.id }, { status: 201 });
}
