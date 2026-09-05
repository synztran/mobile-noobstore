/**
 * Server-side product data fetching — used by async server components.
 * Renders call these functions directly (no HTTP round-trip). The API routes
 * under app/api/products/** compose the same ./queries primitives for the
 * client side of the app.
 */

import "server-only";

import { cache } from "react";
import type {
  ComponentVariantRule,
  ConfiguratorGroup,
  ProductDetail,
  ShopProduct,
  ShopVariantDetail,
} from "@/modules/products/types";
import {
  fetchGiftSupplement,
  fetchKitSupplements,
  getProductListByFilters,
  type GiftSupplement,
  type KitSupplement,
  type VariantRow,
} from "./queries";
import {
  buildProductListCacheKey,
  getCache,
  setCache,
  CACHE_VERSION,
} from "@/lib/redis/cache";
import { optimizeDescriptionHtml } from "@/lib/description-html";
import { getPublicClient } from "@/lib/supabase/public";

export type { ProductDetail };

export type CategoryItem = {
  id: string;
  name: string;
  slug: string;
  thumbnail: string | null;
};

/**
 * Fetch the distinct non-null brands among active saleable products.
 * Cached with React.cache() + Redis (600s TTL), mirrors getCategories().
 */
export const getBrands = cache(async function getBrands(): Promise<string[]> {
  try {
    const cached = await getCache<string[]>("brands");
    if (cached) return cached;

    const { data, error } = await getPublicClient()
      .from("products")
      .select("brand")
      .eq("is_active", true)
      .not("brand", "is", null)
      .neq("brand", "")
      .order("brand");

    if (error) {
      console.error("[getBrands] Supabase error:", error.message);
      return [];
    }

    const seen = new Map<string, string>();
    for (const raw of data ?? []) {
      if (!raw.brand) continue;
      const trimmed = raw.brand.trim();
      if (!trimmed) continue;
      const key = trimmed.toLowerCase();
      if (!seen.has(key)) seen.set(key, trimmed);
    }
    const brands = Array.from(seen.values()).sort((a, b) =>
      a.localeCompare(b, "vi")
    );

    await setCache("brands", brands, 600);
    return brands;
  } catch (err) {
    console.error("[getBrands] Unexpected error:", err);
    return [];
  }
});

/**
 * Fetch all categories for use in server components.
 * Cached with React.cache() + Redis (600s TTL).
 */
export const getCategories = cache(async function getCategories(): Promise<
  CategoryItem[]
> {
  try {
    const cached = await getCache<CategoryItem[]>("categories");
    if (cached) return cached;

    const { data, error } = await getPublicClient()
      .from("categories")
      .select("id, name, slug, thumbnail")
      .order("name");
    if (error) {
      console.error("[getCategories] Supabase error:", error.message);
      return [];
    }

    const result = (data ?? []) as CategoryItem[];
    await setCache("categories", result, 600);
    return result;
  } catch (err) {
    console.error("[getCategories] Unexpected error:", err);
    return [];
  }
});

// ─── Internal row types ───────────────────────────────────────────────────────

type RawVariantRow = {
  id: string;
  variant_name: string;
  price_adjustment: number;
  thumbnail: string | null;
  stock_quantity: number;
  is_pre_order: boolean;
  pre_order_config: unknown;
  attributes: unknown;
};

type RawListRow = {
  id: string;
  slug: string;
  name: string;
  brand: string | null;
  description: string;
  base_price: number;
  stock_quantity: number;
  thumbnail: string | null;
  images: unknown;
  product_type: string;
  is_used: boolean;
  is_pre_order: boolean;
  sold_count: number;
  categories: { id: string; name: string } | null;
  product_variants: RawVariantRow[] | null;
};

// ─── Batch supplement helpers ─────────────────────────────────────────────────

async function prepareSupplements(
  productIds: string[],
  kitIds: string[]
): Promise<{
  kitSupplements: KitSupplement;
  giftsByProductId: GiftSupplement;
}> {
  const [kitSupplements, giftsByProductId] = await Promise.all([
    kitIds.length > 0
      ? fetchKitSupplements(kitIds)
      : Promise.resolve({
          childVariantsByProductId: new Map<string, VariantRow[]>(),
          kitStockById: new Map<string, number>(),
        } as KitSupplement),
    fetchGiftSupplement(productIds),
  ]);
  return { kitSupplements, giftsByProductId };
}

// ─── Pure shapeRow (no side effects, uses batch supplements) ───────────────────

function shapeRow(
  p: RawListRow,
  kitSupplements: KitSupplement,
  giftsByProductId: GiftSupplement = new Map()
): ShopProduct {
  let variants = (p.product_variants ?? []).map((v) => ({
    id: v.id,
    variant_name: v.variant_name,
    price_adjustment: Number(v.price_adjustment),
    effective_price: Number(p.base_price) + Number(v.price_adjustment),
    thumbnail: v.thumbnail,
    stock_quantity: Number(v.stock_quantity ?? 0),
    is_pre_order: v.is_pre_order ?? false,
    pre_order_config:
      (v.pre_order_config as import("@/modules/products/types").ShopVariant["pre_order_config"]) ??
      null,
    attributes: (v.attributes as Record<string, string> | null) ?? null,
  }));

  // If kit, merge in all variants from child components (batch-fetched)
  if (p.product_type === "kit") {
    const childVariants =
      kitSupplements.childVariantsByProductId.get(p.id) ?? [];
    for (const cv of childVariants) {
      variants.push({
        id: cv.id,
        variant_name: cv.variant_name,
        price_adjustment: Number(cv.price_adjustment),
        effective_price: Number(p.base_price) + Number(cv.price_adjustment),
        thumbnail: cv.thumbnail,
        stock_quantity: Number(cv.stock_quantity ?? 0),
        is_pre_order: cv.is_pre_order ?? false,
        pre_order_config:
          (cv.pre_order_config as import("@/modules/products/types").ShopVariant["pre_order_config"]) ??
          null,
        attributes: (cv.attributes as Record<string, string> | null) ?? null,
      });
    }
  }

  const computedMinPrice =
    variants.length > 0
      ? Math.min(
          ...variants
            .filter((v) => v.effective_price > 0)
            .map((v) => v.effective_price)
        )
      : Number(p.base_price);

  const minPrice =
    computedMinPrice === Infinity ||
    (computedMinPrice === 0 && Number(p.base_price) > 0)
      ? Number(p.base_price)
      : computedMinPrice;

  const productType = (p.product_type ??
    "standard") as ShopProduct["product_type"];
  let effectiveStock: number;
  if (productType === "kit") {
    const kitStock = kitSupplements.kitStockById.get(p.id);
    effectiveStock =
      typeof kitStock === "number"
        ? kitStock
        : variants.length > 0
          ? Math.min(...variants.map((v) => v.stock_quantity))
          : Number(p.stock_quantity ?? 0);
  } else if (productType === "component") {
    effectiveStock = variants.reduce(
      (sum, variant) => sum + variant.stock_quantity,
      0
    );
  } else {
    effectiveStock = Number(p.stock_quantity ?? 0);
  }

  const tags: {
    id: number;
    label: string;
    value: string;
    textColor?: string;
    bgColor?: string;
  }[] = [];

  if (effectiveStock === 0) {
    tags.push({
      label: "Hết hàng",
      id: 1,
      value: "sold_out",
    });
  }

  if (p.is_used) {
    tags.push({
      label: "sản phẩm 2nd",
      id: 2,
      value: "used_product",
    });
  }

  const is_pre_order =
    productType === "kit"
      ? variants.some((v) => v.is_pre_order)
      : (p.is_pre_order ?? false);

  const discountPercentage =
    minPrice < Number(p.base_price)
      ? Math.round(
          ((Number(p.base_price) - minPrice) / Number(p.base_price)) * 100
        )
      : 0;

  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    brand: p.brand,
    category: p.categories?.name ?? "Unknown",
    description: p.description ?? "",
    base_price: Number(p.base_price),
    stock_quantity: effectiveStock,
    thumbnail: p.thumbnail,
    images: Array.isArray(p.images) ? (p.images as string[]) : null,
    product_type: productType,
    variants,
    min_price: minPrice,
    is_used: p.is_used ?? false,
    tags,
    is_pre_order,
    discount_price: minPrice < Number(p.base_price) ? minPrice : undefined,
    discount_percentage:
      discountPercentage > 0 ? discountPercentage : undefined,
    sold_count: Number(p.sold_count ?? 0),
    gifts: giftsByProductId.get(p.id) ?? undefined,
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface GetProductsParams {
  search?: string;
  categorySlug?: string;
  brand?: string;
  priceMin?: number;
  priceMax?: number;
  sort?: "newest" | "price_asc" | "price_desc";
  limit?: number;
  offset?: number;
  productTypes?: Array<"standard" | "kit" | "component">;
  /** Trim list payload (excerpt description, one variant for standards). */
  slim?: boolean;
}

export interface GetNoteworthyProductsParams {
  categorySlug?: string;
  limit?: number;
}

export interface GetQuickPickDataParams {
  categorySlug?: string;
  productId?: string;
  search?: string;
  limit?: number;
  sort?: "newest" | "price_asc" | "price_desc";
}

export interface QuickPickData {
  products: ShopProduct[];
  configuratorByProductId: Record<string, ConfiguratorGroup[]>;
  rulesByProductId: Record<string, ComponentVariantRule[]>;
  activeProduct: ShopProduct | null;
  total: number;
}

/**
 * Flexible product query for server components (shop page, search, etc.)
 * Wrapped with React.cache() to deduplicate concurrent calls (shop page
 * fetches this once for total + once in Suspense-bound ProductGrid).
 */
export const getProducts = cache(async function getProducts(
  params: GetProductsParams = {}
): Promise<{ products: ShopProduct[]; total: number }> {
  const {
    search = "",
    categorySlug = "",
    brand = "",
    priceMin = 0,
    priceMax = 0,
    sort = "newest",
    limit,
    offset = 0,
    slim = false,
  } = params;

  try {
    const cacheKey = buildProductListCacheKey({
      search,
      categorySlug,
      brand,
      priceMin,
      priceMax,
      sort,
      limit,
      offset,
      slim,
    });
    const cached = await getCache<{ products: ShopProduct[]; total: number }>(
      cacheKey
    );
    if (cached) return cached;

    const result = await getProductListByFilters({
      search,
      categorySlug,
      brand,
      priceMin,
      priceMax,
      sort,
      limit,
      excludeUncategorized: true,
      offset,
      slim,
    });

    const response = {
      products: result.products as ShopProduct[],
      total: result.total,
    };
    await setCache(cacheKey, response, 600);
    return response;
  } catch (err) {
    console.error("[getProducts] Unexpected error:", err);
    return { products: [], total: 0 };
  }
});

export type ProductSeoInfo = {
  id: string;
  name: string;
  slug: string;
  base_price: number;
  thumbnail: string | null;
};

/**
 * Fetch minimal product data for SEO (JSON-LD structured data).
 * Single-table query, no joins — fast even on Supabase free plan.
 * Cached with React.cache() + Redis (600s TTL).
 */
export const getProductSeoData = cache(async function getProductSeoData(
  limit = 48
): Promise<ProductSeoInfo[]> {
  try {
    const cacheKey = `${CACHE_VERSION}:product-seo-data`;
    const cached = await getCache<ProductSeoInfo[]>(cacheKey);
    if (cached) return cached;

    const { data, error } = await getPublicClient()
      .from("products")
      .select("id, name, slug, base_price, thumbnail")
      .eq("is_active", true)
      .neq("product_type", "gift")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("[getProductSeoData] Supabase error:", error.message);
      return [];
    }

    const result = (data ?? []) as ProductSeoInfo[];
    await setCache(cacheKey, result, 600);
    return result;
  } catch (err) {
    console.error("[getProductSeoData] Unexpected error:", err);
    return [];
  }
});

/**
 * Product feed for the home Noteworthy section.
 * Uses shared product query logic to keep API and server rendering consistent.
 */
export const getNoteworthyProducts = cache(async function getNoteworthyProducts(
  params: GetNoteworthyProductsParams = {}
): Promise<{ products: ShopProduct[]; total: number }> {
  const { categorySlug = "", limit = 8 } = params;

  try {
    const result = await getProductListByFilters({
      categorySlug,
      limit: limit * 2,
      sort: "newest",
      productTypes: ["standard", "kit"],
      excludeUncategorized: true,
    });

    const notable = (result.products as ShopProduct[]).filter(
      (p) => p.stock_quantity > 0
    );

    return {
      products: notable.slice(0, limit),
      total: result.total,
    };
  } catch (err) {
    console.error("[getNoteworthyProducts] Unexpected error:", err);
    return { products: [], total: 0 };
  }
});

/**
 * Fetch products with the same brand as a given product.
 * Returns up to `limit` products, excluding the product itself.
 * Cached with React.cache() + Redis (300s TTL).
 */
export const getRelatedProducts = cache(async function getRelatedProducts(
  brand: string | null,
  excludeSlug: string,
  limit = 8
): Promise<ShopProduct[]> {
  if (!brand) return [];

  try {
    const cached = await getCache<ShopProduct[]>(
      `${CACHE_VERSION}:related-products:${brand}:${excludeSlug}:${limit}`
    );
    if (cached) return cached;

    const result = await getProductListByFilters({
      brand,
      limit,
      sort: "newest",
      productTypes: ["standard", "kit"],
      excludeUncategorized: true,
    });
    const products = (result.products as ShopProduct[]).filter(
      (p) => p.slug !== excludeSlug
    );

    await setCache(
      `${CACHE_VERSION}:related-products:${brand}:${excludeSlug}:${limit}`,
      products,
      300
    );
    return products;
  } catch (err) {
    console.error("[getRelatedProducts] Unexpected error:", err);
    return [];
  }
});

/**
 * Unified QuickPick data loader.
 * Returns product list + all configurator groups needed by QuickPickDrawer
 * in one server call so the client doesn't need to chain product + configurator fetches.
 * Cached with React.cache() + Redis (60s TTL).
 */
export const getQuickPickData = cache(async function getQuickPickData(
  params: GetQuickPickDataParams = {}
): Promise<QuickPickData> {
  const {
    categorySlug = "",
    productId,
    search = "",
    limit,
    sort = "newest",
  } = params;

  try {
    const cacheKey = `${CACHE_VERSION}:quick-pick:${categorySlug}:${productId ?? ""}:${search}:${limit ?? ""}:${sort}`;
    const cached = await getCache<QuickPickData>(cacheKey);
    if (cached) return cached;

    const shouldFetchProductList = Boolean(categorySlug || search || limit);

    let products: ShopProduct[] = [];
    let activeProduct: ShopProduct | null = null;
    let configuratorByProductId: Record<string, ConfiguratorGroup[]> = {};
    let rulesByProductId: Record<string, ComponentVariantRule[]> = {};

    if (!shouldFetchProductList && productId) {
      // ── Single-product fast path: fire all independent queries in parallel ──
      const productPromise = getPublicClient()
        .from("products")
        .select(
          `id, slug, name, brand, description, base_price, stock_quantity, thumbnail, images, product_type, is_used, is_active, is_pre_order, sold_count,
           categories(id, name),
           product_variants(id, variant_name, price_adjustment, thumbnail, stock_quantity, is_pre_order, pre_order_config, attributes)`
        )
        .eq("is_active", true)
        .neq("product_type", "gift")
        .eq("id", productId)
        .maybeSingle();

      const configuratorPromise = getPublicClient()
        .from("product_components")
        .select(
          `parent_product_id, component_group, is_required, max_quantity, component_product_id,
           products!product_components_component_product_id_fkey(
            product_variants(id, variant_name, price_adjustment, thumbnail, stock_quantity, is_pre_order, pre_order_config, attributes)
           )`
        )
        .in("parent_product_id", [productId])
        .order("component_group");

      const rulesPromise = getPublicClient()
        .from("component_variant_rules")
        .select(
          `id, kit_product_id, condition_variant_id, target_component_product_id,
           component_variant_rule_allowed(variant_id)`
        )
        .in("kit_product_id", [productId]);

      const giftPromise = fetchGiftSupplement([productId]);
      const kitPromise = fetchKitSupplements([productId]);

      const [productRes, compRes, ruleRes, giftsByProductId, kitSupplements] =
        await Promise.all([
          productPromise,
          configuratorPromise,
          rulesPromise,
          giftPromise,
          kitPromise,
        ]);

      if (productRes.data && !productRes.error) {
        const row = productRes.data as unknown as RawListRow;
        activeProduct = shapeRow(row, kitSupplements, giftsByProductId);
        if (activeProduct) {
          products = [activeProduct];

          if (activeProduct.product_type === "kit") {
            // Build configurator from parallel result
            if (compRes.data && !compRes.error) {
              type ComponentRow = {
                parent_product_id: string;
                component_group: string;
                is_required: boolean;
                max_quantity: number | null;
                component_product_id: string;
                products?: {
                  product_variants?: Array<{
                    id: string;
                    variant_name: string;
                    price_adjustment: number;
                    thumbnail: string | null;
                    stock_quantity: number;
                    is_pre_order: boolean;
                    pre_order_config: unknown;
                    attributes: unknown;
                  }> | null;
                } | null;
              };

              const parentMap = new Map<
                string,
                Map<string, ConfiguratorGroup>
              >();
              for (const row of (compRes.data ?? []) as ComponentRow[]) {
                if (!parentMap.has(row.parent_product_id)) {
                  parentMap.set(row.parent_product_id, new Map());
                }
                const groups = parentMap.get(row.parent_product_id)!;
                if (!groups.has(row.component_group)) {
                  groups.set(row.component_group, {
                    component_group: row.component_group,
                    is_required: row.is_required,
                    max_quantity: row.max_quantity,
                    variants: [],
                  });
                }
                const group = groups.get(row.component_group)!;
                for (const v of row.products?.product_variants ?? []) {
                  const sale_price_percent =
                    Number(v.price_adjustment) < 0
                      ? Math.round(
                          (1 -
                            (Number(v.price_adjustment) +
                              Number(activeProduct?.base_price ?? 0)) /
                              Number(activeProduct?.base_price ?? 1)) *
                            100
                        )
                      : undefined;
                  group.variants.push({
                    id: v.id,
                    variant_name: v.variant_name,
                    price_adjustment: Number(v.price_adjustment),
                    thumbnail: v.thumbnail ?? null,
                    stock_quantity: Number(v.stock_quantity ?? 0),
                    sale_price_percent,
                    is_pre_order: v.is_pre_order ?? false,
                    pre_order_config:
                      (v.pre_order_config as ConfiguratorGroup["variants"][number]["pre_order_config"]) ??
                      null,
                    component_product_id: row.component_product_id,
                    attributes:
                      (v.attributes as Record<string, string> | null) ?? null,
                  });
                }
              }
              for (const [parentId, groups] of parentMap) {
                configuratorByProductId[parentId] = Array.from(groups.values());
              }
            }

            // Build rules from parallel result
            for (const r of (ruleRes.data ?? []) as Array<{
              id: string;
              kit_product_id: string;
              condition_variant_id: string;
              target_component_product_id: string;
              component_variant_rule_allowed: Array<{ variant_id: string }>;
            }>) {
              if (!rulesByProductId[r.kit_product_id]) {
                rulesByProductId[r.kit_product_id] = [];
              }
              rulesByProductId[r.kit_product_id].push({
                id: r.id,
                condition_variant_id: r.condition_variant_id,
                target_component_product_id: r.target_component_product_id,
                allowed_variant_ids: r.component_variant_rule_allowed.map(
                  (a) => a.variant_id
                ),
              });
            }
          }
        }
      }
    } else {
      // ── Multi-product path (category/search mode) ──
      const result = shouldFetchProductList
        ? await getProducts({ categorySlug, search, limit, sort })
        : { products: [] as ShopProduct[], total: 0 };

      products = [...result.products];
      const productIds = new Set(products.map((p) => p.id));

      if (productId) {
        activeProduct = products.find((p) => p.id === productId) ?? null;

        if (!activeProduct) {
          const { data, error } = await getPublicClient()
            .from("products")
            .select(
              `id, slug, name, brand, description, base_price, stock_quantity, thumbnail, images, product_type, is_used, is_active, is_pre_order, sold_count,
               categories(id, name),
               product_variants(id, variant_name, price_adjustment, thumbnail, stock_quantity, is_pre_order, pre_order_config, attributes)`
            )
            .eq("is_active", true)
            .neq("product_type", "gift")
            .eq("id", productId)
            .single();

          if (!error && data) {
            const row = data as unknown as RawListRow;
            const { kitSupplements, giftsByProductId } =
              await prepareSupplements(
                [row.id],
                row.product_type === "kit" ? [row.id] : []
              );
            activeProduct = shapeRow(row, kitSupplements, giftsByProductId);
            if (activeProduct) {
              products.push(activeProduct);
              productIds.add(activeProduct.id);
            }
          }
        }
      }

      configuratorByProductId = {};
      const ids = Array.from(productIds);

      const needsConfigurator =
        ids.length > 0 && products.some((p) => p.product_type === "kit");
      if (needsConfigurator) {
        const { data: componentRows, error: componentError } =
          await getPublicClient()
            .from("product_components")
            .select(
              `parent_product_id, component_group, is_required, max_quantity, component_product_id,
               products!product_components_component_product_id_fkey(
                product_variants(id, variant_name, price_adjustment, thumbnail, stock_quantity, is_pre_order, pre_order_config, attributes)
               )`
            )
            .in("parent_product_id", ids)
            .order("component_group");

        if (componentError) {
          console.error(
            "[getQuickPickData] product_components error:",
            componentError.message
          );
        } else {
          type ComponentRow = {
            parent_product_id: string;
            component_group: string;
            is_required: boolean;
            max_quantity: number | null;
            component_product_id: string;
            products?: {
              product_variants?: Array<{
                id: string;
                variant_name: string;
                price_adjustment: number;
                thumbnail: string | null;
                stock_quantity: number;
                is_pre_order: boolean;
                pre_order_config: unknown;
                attributes: unknown;
              }> | null;
            } | null;
          };

          const parentMap = new Map<string, Map<string, ConfiguratorGroup>>();

          for (const row of (componentRows ?? []) as ComponentRow[]) {
            if (!parentMap.has(row.parent_product_id)) {
              parentMap.set(row.parent_product_id, new Map());
            }

            const groups = parentMap.get(row.parent_product_id)!;
            if (!groups.has(row.component_group)) {
              groups.set(row.component_group, {
                component_group: row.component_group,
                is_required: row.is_required,
                max_quantity: row.max_quantity,
                variants: [],
              });
            }

            const group = groups.get(row.component_group)!;
            for (const v of row.products?.product_variants ?? []) {
              const sale_price_percent =
                Number(v.price_adjustment) < 0
                  ? Math.round(
                      (1 -
                        (Number(v.price_adjustment) +
                          Number(activeProduct?.base_price ?? 0)) /
                          Number(activeProduct?.base_price ?? 1)) *
                        100
                    )
                  : undefined;
              group.variants.push({
                id: v.id,
                variant_name: v.variant_name,
                price_adjustment: Number(v.price_adjustment),
                thumbnail: v.thumbnail ?? null,
                stock_quantity: Number(v.stock_quantity ?? 0),
                sale_price_percent,
                is_pre_order: v.is_pre_order ?? false,
                pre_order_config:
                  (v.pre_order_config as ConfiguratorGroup["variants"][number]["pre_order_config"]) ??
                  null,
                component_product_id: row.component_product_id,
                attributes:
                  (v.attributes as Record<string, string> | null) ?? null,
              });
            }
          }

          for (const [parentId, groups] of parentMap) {
            configuratorByProductId[parentId] = Array.from(groups.values());
          }
        }
      }

      // ── Fetch rules for kit products ──
      const kitIds = Object.keys(configuratorByProductId);
      rulesByProductId = {};
      if (kitIds.length > 0) {
        const { data: ruleRows } = await getPublicClient()
          .from("component_variant_rules")
          .select(
            `id, kit_product_id, condition_variant_id, target_component_product_id,
             component_variant_rule_allowed(variant_id)`
          )
          .in("kit_product_id", kitIds);

        for (const r of (ruleRows ?? []) as Array<{
          id: string;
          kit_product_id: string;
          condition_variant_id: string;
          target_component_product_id: string;
          component_variant_rule_allowed: Array<{ variant_id: string }>;
        }>) {
          if (!rulesByProductId[r.kit_product_id]) {
            rulesByProductId[r.kit_product_id] = [];
          }
          rulesByProductId[r.kit_product_id].push({
            id: r.id,
            condition_variant_id: r.condition_variant_id,
            target_component_product_id: r.target_component_product_id,
            allowed_variant_ids: r.component_variant_rule_allowed.map(
              (a) => a.variant_id
            ),
          });
        }
      }
    }

    // ── Recompute kit stock from component variant data ─────────────
    for (const product of products) {
      if (product.product_type !== "kit") continue;
      const groups = configuratorByProductId[product.id];
      if (!groups || groups.length === 0) continue;

      const requiredGroups = groups.filter((g) => g.is_required);
      if (requiredGroups.length === 0) continue;

      const groupStocks = requiredGroups.map((g) =>
        g.variants.reduce((sum, v) => sum + v.stock_quantity, 0)
      );
      product.stock_quantity = Math.min(...groupStocks);

      product.tags = product.tags.filter((t) => t.value !== "sold_out");
      if (product.stock_quantity === 0) {
        product.tags.unshift({
          id: 1,
          label: "Hết hàng",
          value: "sold_out",
        });
      }
    }

    if (activeProduct) {
      const refreshed = products.find((p) => p.id === activeProduct!.id);
      if (refreshed) activeProduct = refreshed;
    }

    const quickPickResult: QuickPickData = {
      products,
      configuratorByProductId,
      rulesByProductId,
      activeProduct,
      total: products.length,
    };
    await setCache(cacheKey, quickPickResult, 60);
    return quickPickResult;
  } catch (err) {
    console.error("[getQuickPickData] Unexpected error:", err);
    return {
      products: [],
      configuratorByProductId: {},
      rulesByProductId: {},
      activeProduct: null,
      total: 0,
    };
  }
});

/**
 * Fetch the N newest products for use in server components.
 * Cached with React.cache() (per‑render deduplication) + Redis (cross‑request, 120s TTL).
 */
export const getNewestProducts = cache(async function getNewestProducts(
  limit: number
): Promise<ShopProduct[]> {
  try {
    const cached = await getCache<ShopProduct[]>(
      `${CACHE_VERSION}:newest-products:${limit}`
    );
    if (cached) return cached;

    const { data, error } = await getPublicClient()
      .from("products")
      .select(
        `id, slug, name, brand, description, base_price, stock_quantity, thumbnail, images, product_type, is_used, is_active, sold_count,
         categories(id, name),
		 product_variants(id, variant_name, price_adjustment, thumbnail, stock_quantity, is_pre_order, pre_order_config, attributes)`
      )
      .eq("is_active", true)
      .neq("product_type", "gift")
      .in("product_type", ["standard", "kit"])
      .limit(limit);

    if (error) {
      console.error("[getNewestProducts] Supabase error:", error.message);
      return [];
    }
    if (!data) return [];

    const rows = data as unknown as RawListRow[];
    const kitIds = rows
      .filter((r) => r.product_type === "kit")
      .map((r) => r.id);
    const allIds = rows.map((r) => r.id);
    const { kitSupplements, giftsByProductId } = await prepareSupplements(
      allIds,
      kitIds
    );

    const products = rows.map((row) =>
      shapeRow(row, kitSupplements, giftsByProductId)
    );

    await setCache(`${CACHE_VERSION}:newest-products:${limit}`, products, 120);
    return products;
  } catch (err) {
    console.error("[getNewestProducts] Unexpected error:", err);
    return [];
  }
});

/**
 * Find products frequently bought together with the given product.
 * Queries order_items grouped by co-occurrence in the same order.
 * Cached with React.cache() + Redis (300s TTL).
 */
export const getFrequentlyBoughtTogether = cache(
  async function getFrequentlyBoughtTogether(
    productId: string,
    limit = 6
  ): Promise<ShopProduct[]> {
    try {
      const cached = await getCache<ShopProduct[]>(
        `${CACHE_VERSION}:fbt:${productId}:${limit}`
      );
      if (cached) return cached;

      const { data: sameOrders } = await getPublicClient()
        .from("order_items")
        .select("order_id")
        .eq("product_id", productId)
        .limit(50);

      if (!sameOrders || sameOrders.length === 0) return [];

      const orderIds = [...new Set(sameOrders.map((o) => o.order_id))].filter(
        Boolean
      );

      if (orderIds.length === 0) return [];

      const { data: coItems } = await getPublicClient()
        .from("order_items")
        .select("product_id")
        .in("order_id", orderIds)
        .not("product_id", "eq", productId)
        .not("product_id", "is", null);

      if (!coItems || coItems.length === 0) return [];

      const freq = new Map<string, number>();
      for (const item of coItems) {
        const pid = item.product_id as string;
        freq.set(pid, (freq.get(pid) ?? 0) + 1);
      }

      const topIds = [...freq.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([id]) => id);

      if (topIds.length === 0) return [];

      const { data: products } = await getPublicClient()
        .from("products")
        .select(
          `id, slug, name, brand, description, base_price, stock_quantity, thumbnail, images, product_type, is_used, is_active, sold_count,
         categories(id, name),
         product_variants(id, variant_name, price_adjustment, thumbnail, stock_quantity, is_pre_order, pre_order_config, attributes)`
        )
        .eq("is_active", true)
        .neq("product_type", "gift")
        .in("id", topIds);

      if (!products) return [];

      const rows = products as unknown as RawListRow[];
      const kitIds = rows
        .filter((r) => r.product_type === "kit")
        .map((r) => r.id);
      const allIds = rows.map((r) => r.id);
      const { kitSupplements, giftsByProductId } = await prepareSupplements(
        allIds,
        kitIds
      );

      const result = rows.map((row) =>
        shapeRow(row, kitSupplements, giftsByProductId)
      );

      await setCache(`${CACHE_VERSION}:fbt:${productId}:${limit}`, result, 300);
      return result;
    } catch {
      return [];
    }
  }
);

/**
 * Get the number of times a product has been purchased (delivered orders).
 * Cached with React.cache() + Redis (300s TTL).
 */
export const getProductPurchaseCount = cache(
  async function getProductPurchaseCount(productId: string): Promise<number> {
    try {
      const cached = await getCache<number>(
        `${CACHE_VERSION}:purchase-count:${productId}`
      );
      if (cached !== null) return cached;

      const { data, error } = await getPublicClient()
        .from("order_items")
        .select("quantity, orders!inner(status)")
        .eq("product_id", productId)
        .eq("orders.status", "delivered");

      if (error) return 0;
      if (!data || data.length === 0) return 0;
      const count = (data as { quantity: number }[]).reduce(
        (sum, item) => sum + Number(item.quantity),
        0
      );

      await setCache(
        `${CACHE_VERSION}:purchase-count:${productId}`,
        count,
        300
      );
      return count;
    } catch {
      return 0;
    }
  }
);

/**
 * Fetch conditional variant rules for a kit product.
 * Cached with React.cache() + Redis (60s TTL).
 */
export const getComponentRules = cache(async function getComponentRules(
  productId: string
): Promise<ComponentVariantRule[]> {
  try {
    const cached = await getCache<ComponentVariantRule[]>(
      `${CACHE_VERSION}:component-rules:${productId}`
    );
    if (cached) return cached;

    const { data: ruleRows } = await getPublicClient()
      .from("component_variant_rules")
      .select(
        `id, condition_variant_id, target_component_product_id,
					 component_variant_rule_allowed(variant_id)`
      )
      .eq("kit_product_id", productId);

    const componentRules: ComponentVariantRule[] = (ruleRows ?? []).map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (r: any) => ({
        id: r.id,
        condition_variant_id: r.condition_variant_id,
        target_component_product_id: r.target_component_product_id,
        allowed_variant_ids: (r.component_variant_rule_allowed ?? []).map(
          (a: { variant_id: string }) => a.variant_id
        ),
      })
    );

    await setCache(
      `${CACHE_VERSION}:component-rules:${productId}`,
      componentRules,
      60
    );
    return componentRules;
  } catch (err) {
    console.error("[getComponentRules] Unexpected error:", err);
    return [];
  }
});

/**
 * Fetch a product by slug with its selectable component groups for the
 * interactive product detail page.
 *
 * Component groups are derived from the child products already fetched by
 * getProductBySlug — no extra child-products query is needed. Conditional
 * variant rules are fetched separately via the cached getComponentRules.
 *
 * Returns { product, componentGroups } ready for ProductView.
 */
export const getProductDetail = cache(async function getProductDetail(
  slug: string
): Promise<{
  product: ProductDetail;
  componentGroups: ConfiguratorGroup[];
  componentRules: ComponentVariantRule[];
} | null> {
  try {
    const product = await getProductBySlug(slug);
    if (!product) return null;

    // Build configurator groups from the already-fetched child products,
    // keeping only linked products of type 'component' (same filter as the
    // previous child-products query).
    const groupMap = new Map<string, ConfiguratorGroup>();

    for (const comp of product.components) {
      const child = comp.component_product;
      if (child.product_type !== "component") continue; // not a 'component' type product — skip

      if (!groupMap.has(comp.component_group)) {
        groupMap.set(comp.component_group, {
          component_group: comp.component_group,
          is_required: comp.is_required,
          max_quantity: comp.max_quantity,
          variants: [],
        });
      }

      const group = groupMap.get(comp.component_group)!;
      for (const v of child.variants) {
        group.variants.push({
          id: v.id,
          variant_name: v.variant_name,
          price_adjustment: Number(v.price_adjustment),
          thumbnail: v.thumbnail ?? null,
          stock_quantity: Number(v.stock_quantity ?? 0),
          sale_price_percent: undefined,
          is_pre_order: v.is_pre_order ?? false,
          pre_order_config:
            (v.pre_order_config as ConfiguratorGroup["variants"][number]["pre_order_config"]) ??
            null,
          component_product_id: comp.component_product.id,
          attributes: (v.attributes as Record<string, string> | null) ?? null,
        });
      }
    }

    const componentRules =
      groupMap.size > 0 ? await getComponentRules(product.id) : [];

    return {
      product,
      componentGroups: Array.from(groupMap.values()),
      componentRules,
    };
  } catch (err) {
    console.error("[getProductDetail] Unexpected error:", err);
    return null;
  }
});

/**
 * Fetch a single product by slug for the product detail page.
 * Wrapped with React.cache() to deduplicate in-flight requests within
 * the same render pass (e.g. generateMetadata + page body).
 */
export const getProductBySlug = cache(async function getProductBySlug(
  slug: string
): Promise<ProductDetail | null> {
  try {
    const cached = await getCache<ProductDetail>(
      `${CACHE_VERSION}:product:slug:${slug}`
    );
    if (cached) return cached;

    const { data: product, error } = await getPublicClient()
      .from("products")
      .select(
        `id, slug, name, brand, description, base_price, stock_quantity, category_id, thumbnail, images, product_type, is_used, is_active, attributes, sale_ends_at, sold_count,
			 categories(id, name),
			 product_variants(id, variant_name, price_adjustment, thumbnail, stock_quantity, is_pre_order, pre_order_config, attributes),
				 product_components!product_components_parent_product_id_fkey(
				 	id, component_group, is_required, max_quantity, component_product_id
				 )`
      )
      .eq("is_active", true)
      .neq("product_type", "gift")
      .eq("slug", slug)
      .maybeSingle();

    if (error || !product) return null;

    type RawComponentRow = {
      id: string;
      component_group: string;
      is_required: boolean;
      max_quantity: number | null;
      component_product_id: string;
    };

    const raw = product as unknown as RawListRow & {
      category_id: string | null;
      product_components: RawComponentRow[] | null;
    };

    const variants = (raw.product_variants ?? []).map((v) => ({
      id: v.id,
      variant_name: v.variant_name,
      price_adjustment: Number(v.price_adjustment),
      effective_price: Number(raw.base_price) + Number(v.price_adjustment),
      thumbnail: v.thumbnail,
      stock_quantity: Number(v.stock_quantity ?? 0),
      is_pre_order: v.is_pre_order ?? false,
      pre_order_config:
        (v.pre_order_config as ShopVariantDetail["pre_order_config"]) ?? null,
      attributes: (v.attributes as Record<string, string> | null) ?? null,
    }));

    const computedMinPrice =
      variants.length > 0
        ? Math.min(...variants.map((v) => v.effective_price))
        : Number(raw.base_price);

    const minPrice =
      computedMinPrice === 0 && Number(raw.base_price) > 0
        ? Number(raw.base_price)
        : computedMinPrice;

    if (computedMinPrice === 0 && Number(raw.base_price) > 0) {
      console.warn(
        `[getProductBySlug] min_price clamped for ${raw.id} (${raw.name}): basePrice=${raw.base_price}, variants=${variants.length}`
      );
    }

    const compIds = (raw.product_components ?? []).map(
      (c) => c.component_product_id
    );

    // Fire the component-products and gift-products lookups in parallel — both
    // depend only on the already-fetched product row.
    const [compData, giftRows] = await Promise.all([
		compIds.length > 0
			? getPublicClient()
				.from("products")
				.select(
					`id, slug, name, base_price, stock_quantity, thumbnail, images, product_type, is_used, is_active,
			categories(id, name),
			product_variants(id, variant_name, price_adjustment, thumbnail, stock_quantity, is_pre_order, pre_order_config, attributes)`
				)
				.eq("is_active", true)
				.in("id", compIds)
        : Promise.resolve({ data: null }),
      getPublicClient()
        .from("gift_products")
        .select("quantity, gift:gift_product_id!inner(name, slug, thumbnail)")
        .eq("product_id", raw.id),
    ]);

    let componentProducts: ShopProduct[] = [];
    if (compData?.data) {
      const emptySupplements: KitSupplement = {
        childVariantsByProductId: new Map(),
        kitStockById: new Map(),
      };
      componentProducts = (compData.data as unknown as RawListRow[]).map(
        (row) => shapeRow(row, emptySupplements)
      );
    }

    // Compute effective stock for kit products from required child component stocks.
    // Mirrors the logic in getProducts().
    const requiredComponentIds = new Set(
      (raw.product_components ?? [])
        .filter((c) => c.is_required)
        .map((c) => c.component_product_id)
    );
    const requiredChildStocks = componentProducts
      .filter((cp) => requiredComponentIds.has(cp.id))
      .map((cp) => cp.stock_quantity);
    const effectiveStock =
      raw.product_type === "kit" && requiredChildStocks.length > 0
        ? Math.min(...requiredChildStocks)
        : Number(raw.stock_quantity ?? 0);

    const components = (raw.product_components ?? []).map((c) => {
      const cp = componentProducts.find((p) => p.id === c.component_product_id);
      return {
        id: c.id,
        component_group: c.component_group,
        is_required: c.is_required,
        max_quantity: c.max_quantity,
        component_product: cp
          ? {
              id: cp.id,
              name: cp.name,
              slug: cp.slug,
              base_price: cp.base_price,
              thumbnail: cp.thumbnail,
              images: cp.images,
              product_type: cp.product_type,
              variants: cp.variants,
            }
          : {
              id: c.component_product_id,
              name: "Unknown",
              slug: "",
              base_price: 0,
              thumbnail: null,
              images: null,
              product_type: "standard" as const,
              variants: [],
            },
      };
    });

    const giftData = giftRows?.data as unknown as
      | Array<{
          quantity: number;
          gift: { name: string; slug: string; thumbnail: string | null };
        }>
      | null
      | undefined;

    const gifts: ProductDetail["gifts"] =
      giftData?.map((g) => ({
        gift_name: g.gift.name,
        gift_slug: g.gift.slug,
        gift_thumbnail: g.gift.thumbnail,
        quantity: g.quantity,
      })) ?? undefined;

    const productDetail: ProductDetail & { gifts?: unknown } = {
      ...raw,
      id: raw.id,
      slug: raw.slug,
      name: raw.name,
      brand: raw.brand ?? null,
      description: optimizeDescriptionHtml(raw.description),
      category: raw.categories?.name ?? "Unknown",
      category_id: raw.category_id,
      base_price: Number(raw.base_price),
      stock_quantity: effectiveStock,
      thumbnail: raw.thumbnail,
      images: Array.isArray(raw.images) ? (raw.images as string[]) : null,
      product_type: (raw.product_type ??
        "standard") as ProductDetail["product_type"],
      variants,
      components,
      min_price: minPrice,
      is_used: raw.is_used ?? false,
      is_pre_order: variants.some((v) => v.is_pre_order),
      sale_ends_at:
        ((raw as Record<string, unknown>).sale_ends_at as string | null) ??
        null,
      sold_count: Number(raw.sold_count ?? 0),
      gifts,
    };

    await setCache(`${CACHE_VERSION}:product:slug:${slug}`, productDetail, 60);
    return productDetail;
  } catch (err) {
    console.error("[getProductBySlug] Unexpected error:", err);
    return null;
  }
});
