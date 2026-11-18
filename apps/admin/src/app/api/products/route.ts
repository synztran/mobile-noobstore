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
      `id, name, slug, product_type, base_price, stock_quantity, is_active,
			 product_variants(id, variant_name, stock_quantity, price_adjustment),
			 product_components!product_components_parent_product_id_fkey(
			   id, component_group, is_required,
			   products!product_components_component_product_id_fkey(id, name, slug)
			 )`
    )
    .order("name");

  if (productType && productType !== "all") {
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

  // A kit is unbuyable until component products are attached (the cart gate
  // finds no component variants and 409s). Never let one go live at insert
  // time — activation happens later, via PATCH, once components exist.
  if (body?.product_type === "kit" && body?.is_active) {
    return NextResponse.json(
      {
        error:
          "A kit must have component products attached before it can be activated. It was created inactive — attach components, then activate it.",
      },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("products")
    .insert(body)
    .select("id")
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  try {
    const { invalidateProductCaches } = await import("@/lib/redis/cache");
    await invalidateProductCaches();
  } catch (err) {
    console.error("[admin/products/POST] cache invalidation failed:", err);
  }
  try {
    if (body?.slug) {
      const { scrapeFacebookProduct } = await import("@/lib/facebook/scrape");
      const url = `https://www.noobstore.xyz/shop/${body.slug}`;
      // Awaited deliberately: on serverless, a fire-and-forget promise can be
      // frozen when the response is sent, so the scrape silently never ran.
      // The callee polls until the storefront serves a real og:url, so this
      // only blocks on a genuinely slow first paint.
      await scrapeFacebookProduct(url);
    }
  } catch (err) {
    console.error("[admin/products/POST] fb scrape failed:", err);
  }
  return NextResponse.json({ id: data.id }, { status: 201 });
}
