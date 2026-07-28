import { getCache, setCache, CACHE_VERSION } from "@/lib/redis/cache";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import {
  fetchKitSupplements,
  type VariantRow,
} from "@/lib/product-query-service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const q = req.nextUrl.searchParams.get("q") ?? "";
    const excludeTypes = req.nextUrl.searchParams.get("exclude_types") ?? "";

    const cacheKey = `${CACHE_VERSION}:search:suggestions:${q}:${excludeTypes}`;
    const cached = await getCache<any[]>(cacheKey);
    if (cached) return NextResponse.json(cached);

    const supabase = await createClient();
    let query = supabase
      .from("products")
      .select("id, name, slug, thumbnail, base_price, product_type, product_variants(id, price_adjustment)")
      .eq("is_active", true)
      .order("name", { ascending: true })
      .limit(20);

    if (q.trim()) {
      query = query.ilike("name", `%${q.trim()}%`);
    }

    if (excludeTypes) {
      const types = excludeTypes.split(",").map((t) => t.trim()).filter(Boolean);
      if (types.length > 0) {
        types.forEach((t) => {
          query = query.neq("product_type", t);
        });
      }
    }

    const { data: rawData, error } = await query;

    if (error) throw error;

    const rows = rawData ?? [];
    const kitIds = rows
      .filter((r: any) => r.product_type === "kit")
      .map((r: any) => r.id);
    const kitSupps =
      kitIds.length > 0 ? await fetchKitSupplements(kitIds) : null;

    const data = rows.map((row: any) => {
      const basePrice = Number(row.base_price);
      const directVariants: VariantRow[] = row.product_variants ?? [];
      const childVariants =
        kitSupps?.childVariantsByProductId.get(row.id) ?? [];
      const allVariants = [...directVariants, ...childVariants];

      const minPrice =
        allVariants.length > 0
          ? Math.min(
              ...allVariants.map((v) => basePrice + Number(v.price_adjustment)),
            )
          : basePrice;

      return {
        id: row.id,
        name: row.name,
        slug: row.slug,
        thumbnail: row.thumbnail,
        base_price: basePrice,
        min_price: minPrice,
        product_type: row.product_type,
      };
    });

    await setCache(cacheKey, data, 60);

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
