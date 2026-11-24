import {
  getProductListByFilters,
  getProductsByIds,
  type ProductSortOption,
  type ProductType,
} from "@/modules/products/server/queries";
import type { ProductsResponse, ShopProduct } from "@/modules/products/types";
import {
	buildProductListCacheKey,
	PRODUCT_LIST_CACHE_TTL,
	publicCacheHeaders,
	readThroughCache,
} from "@/lib/redis/cache";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// ─── Cache & Performance Settings ───────────────────────────────────────────
const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 20;

// ─── Internal row types ───────────────────────────────────────────────────────

// ─── GET /api/products ────────────────────────────────────────────────────────
//
// Query params:
//   search       — full-text search on name (max 100 chars)
//   category     — category slug (exact match, max 100 chars)
//   productType  — comma-separated: "standard,kit,component" (default: all)
//   priceMin     — minimum price (default 0)
//   priceMax     — maximum price (default 0 = no upper limit)
//   sort         — "newest" | "price_asc" | "price_desc" (default: "newest")
//   offset       — pagination offset (default 0)
//   limit        — results per page (default 20, max 100)
//
// Response:
//   { products: ShopProduct[], total: number }
//
// Optimizations:
//   ✓ DB-level filtering (search, price, category)
//   ✓ DB-level sorting before pagination
//   ✓ Pagination via range() to avoid fetching excess records
//   ✓ Exact count() for total
//   ✓ Cache headers (60s CDN, 300s stale-while-revalidate)
//   ✓ Input validation & bounds checking

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;

  // Validate and sanitize input parameters
  const search = sp.get("search")?.trim().slice(0, 100) ?? "";
  const categorySlug = [...new Set(sp.getAll("category").map((v) => v.trim().slice(0, 100)).filter(Boolean))];
  const brand = [...new Set(sp.getAll("brand").map((v) => v.trim().slice(0, 100)).filter(Boolean))];
  const productTypeParam =
    sp.get("productType")?.trim() ?? "standard,kit,component";
  const productTypes = productTypeParam
    .split(",")
    .map((t) => t.trim())
    .filter(
      (t): t is ProductType =>
        t === "standard" || t === "kit" || t === "component"
    );

  // Parse and validate numeric parameters
  const priceMin = Math.max(0, Number(sp.get("priceMin") ?? 0) || 0);
  const priceMax = Math.max(0, Number(sp.get("priceMax") ?? 0) || 0);
  const offset = Math.max(0, Number(sp.get("offset") ?? 0) || 0);
  let limit = sp.get("limit") ? Number(sp.get("limit")) : DEFAULT_LIMIT;
  limit = Math.min(Math.max(1, limit), MAX_LIMIT); // Bound: 1-100

  const sort = (sp.get("sort") as ProductSortOption | null) ?? "newest";

  // Optional comma-separated `ids` filter — fetches only the requested products
  // (active standard/kit only; missing ids are omitted from the response).
  const ids = sp
    .get("ids")
    ?.split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  try {
    if (ids && ids.length > 0) {
      const products = (await getProductsByIds(ids.slice(0, 100))) as ShopProduct[];
      return NextResponse.json<ProductsResponse>({ products, total: products.length });
    }

    // Build a stable cache key from normalized params — shared with the SSR
    // `getProducts` path so a single warm entry serves both.
    // Search queries are cached too — useful for repeated searches within 60 s
    const cacheKey = buildProductListCacheKey({
      search,
      categorySlug,
      brand,
      priceMin,
      priceMax,
      sort,
      limit,
      offset,
      slim: true,
      soldOutLast: true,
    });

    const response = await readThroughCache<ProductsResponse>(
      cacheKey,
      PRODUCT_LIST_CACHE_TTL,
      async () => {
        const { products, total } = await getProductListByFilters({
          search,
          categorySlug,
          brand,
          priceMin,
          priceMax,
          sort,
          limit,
          offset,
          slim: true,
          productTypes:
            productTypes.length > 0
              ? productTypes
              : (["standard", "kit", "component"] as ProductType[]),
          // /shop wants sold-out products sunk below available ones. This is a
          // /shop-only affordance; the other product feeds (sale rail,
          // noteworthy, related) keep the plain SQL ordering.
          soldOutLast: true,
        });

        return {
          products: products as ShopProduct[],
          total,
        };
      }
    );

    return NextResponse.json<ProductsResponse>(response, {
      headers: publicCacheHeaders(),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
