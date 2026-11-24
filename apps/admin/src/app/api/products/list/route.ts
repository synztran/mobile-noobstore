import { isInStock } from "@/lib/product-utils";
import {
  buildProductsListQuery,
  PRODUCTS_PAGE_SIZE,
} from "@/lib/products-list-query";
import { getAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const q = sp.get("q") ?? "";
  const productType = sp.get("productType") ?? "";
  const excludeSoldOut = sp.get("excludeSoldOut") === "true";
  const page = Math.max(1, parseInt(sp.get("page") ?? "1", 10));
  const ids = sp
    .get("ids")
    ?.split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  const supabase = getAdminClient();

  let query = buildProductsListQuery(supabase, { page, productType });
  if (q) query = query.ilike("name", `%${q}%`);
  if (ids && ids.length > 0) query = query.in("id", ids);

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let products = (data ?? []) as unknown[];
  if (excludeSoldOut) {
    products = products.filter((p) =>
      isInStock(p as Parameters<typeof isInStock>[0])
    );
  }

  const totalPages = Math.max(
    1,
    Math.ceil((excludeSoldOut ? products.length : (count ?? 0)) / PRODUCTS_PAGE_SIZE)
  );

  return NextResponse.json({
    products,
    count: excludeSoldOut ? products.length : (count ?? 0),
    page,
    totalPages,
  });
}
