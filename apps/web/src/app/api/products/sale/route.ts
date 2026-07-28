import { getSaleProducts } from "@/lib/sale-products-server";
import { getCache, setCache, CACHE_VERSION } from "@/lib/redis/cache";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const categorySlug = sp.get("category")?.trim() ?? "";
  const limit = sp.get("limit") ? Number(sp.get("limit")) : 8;
  const sort =
    (sp.get("sort") as
      | "discount_desc"
      | "price_asc"
      | "price_desc"
      | "newest"
      | null) ?? "discount_desc";

  const safeLimit = Number.isFinite(limit)
    ? Math.min(Math.max(1, Math.floor(limit)), 100)
    : 8;

  try {
    const cacheKey = `${CACHE_VERSION}:sale-products:${categorySlug}:${safeLimit}:${sort}`;
    const cached = await getCache<{ products: never[]; total: number }>(cacheKey);
    if (cached) return NextResponse.json(cached);

    const result = await getSaleProducts({
      categorySlug,
      limit: safeLimit,
      sort,
      excludeSoldOut: true,
    });

    await setCache(cacheKey, result, 120);

    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
