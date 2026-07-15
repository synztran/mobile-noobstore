/**
 * Server-side product data fetching — used by async server components.
 * Mirrors the shaping logic in /api/products/route.ts.
 */

import { cache } from "react";
import type {
  ComponentVariantRule,
  ConfiguratorGroup,
} from "@/app/api/products/[slug]/configurator/route";
import type {
  ProductDetail,
  ShopVariantDetail,
} from "@/app/api/products/[slug]/route";
import type { ShopProduct } from "@/app/api/products/route";
import { getProductListByFilters } from "@/lib/product-query-service";
import { getCache, setCache } from "@/lib/redis/cache";
import {
  fetchKitSupplements,
  fetchGiftSupplement,
  type KitSupplement,
  type GiftSupplement,
  type VariantRow,
} from "@/lib/product-query-service";
import { getPublicClient } from "@/lib/supabase/public";

export type { ProductDetail };

export type CategoryItem = {
  id: string;
  name: string;
  slug: string;
  thumbnail: string | null;
};

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
      (v.pre_order_config as import("@/app/api/products/route").ShopVariant["pre_order_config"]) ??
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
          (cv.pre_order_config as import("@/app/api/products/route").ShopVariant["pre_order_config"]) ??
          null,
        attributes:
          (cv.attributes as Record<string, string> | null) ?? null,
      });
    }
  }

  const minPrice =
    variants.length > 0
      ? Math.min(...variants.map((v) => v.effective_price))
      : Number(p.base_price);

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
    is_pre_order: variants.some((v) => v.is_pre_order),
    sold_count: Number(p.sold_count ?? 0),
    gifts: giftsByProductId.get(p.id) ?? undefined,
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface GetProductsParams {
  search?: string;
  categorySlug?: string;
  priceMin?: number;
  priceMax?: number;
  sort?: "newest" | "price_asc" | "price_desc";
  limit?: number;
  offset?: number;
  productTypes?: Array<"standard" | "kit" | "component">;
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
    priceMin = 0,
    priceMax = 0,
    sort = "newest",
    limit,
    offset = 0,
  } = params;

  try {
    const result = await getProductListByFilters({
      search,
      categorySlug,
      priceMin,
      priceMax,
      sort,
      limit,
      // productTypes: params.productTypes ?? ["standard", "kit", "component"],
      excludeUncategorized: true,
      offset,
    });

    return {
      products: result.products as ShopProduct[],
      total: result.total,
    };
  } catch (err) {
    console.error("[getProducts] Unexpected error:", err);
    return { products: [], total: 0 };
  }
});

/**
 * Product feed for the home Noteworthy section.
 * Uses shared product query logic to keep API and server rendering consistent.
 */
export const getNoteworthyProducts = cache(
  async function getNoteworthyProducts(
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
  }
);

/**
 * Fetch products with the same brand as a given product.
 * Returns up to `limit` products, excluding the product itself.
 * Cached with React.cache() + Redis (300s TTL).
 */
export const getRelatedProducts = cache(
  async function getRelatedProducts(
    brand: string | null,
    excludeSlug: string,
    limit = 8
  ): Promise<ShopProduct[]> {
    if (!brand) return [];

    try {
      const cached = await getCache<ShopProduct[]>(
        `related-products:${brand}:${excludeSlug}:${limit}`
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
        `related-products:${brand}:${excludeSlug}:${limit}`,
        products,
        300
      );
      return products;
    } catch (err) {
      console.error("[getRelatedProducts] Unexpected error:", err);
      return [];
    }
  }
);

/**
 * Unified QuickPick data loader.
 * Returns product list + all configurator groups needed by QuickPickDrawer
 * in one server call so the client doesn't need to chain product + configurator fetches.
 * Cached with React.cache() + Redis (60s TTL).
 */
export const getQuickPickData = cache(
  async function getQuickPickData(
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
    const cacheKey = `quick-pick:${categorySlug}:${productId ?? ""}:${search}:${limit ?? ""}:${sort}`;
    const cached = await getCache<QuickPickData>(cacheKey);
    if (cached) return cached;

    const shouldFetchProductList = Boolean(categorySlug || search || limit);
    const result = shouldFetchProductList
      ? await getProducts({
          categorySlug,
          search,
          limit,
          sort,
        })
      : { products: [] as ShopProduct[], total: 0 };

    const products = [...result.products];
    const productIds = new Set(products.map((p) => p.id));

    let activeProduct: ShopProduct | null = null;
    if (productId) {
      activeProduct = products.find((p) => p.id === productId) ?? null;

      if (!activeProduct) {
        const { data, error } = await getPublicClient()
          .from("products")
          .select(
            `id, slug, name, brand, description, base_price, stock_quantity, thumbnail, images, product_type, is_used, is_active, sold_count,
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

    const configuratorByProductId: Record<string, ConfiguratorGroup[]> = {};
    const ids = Array.from(productIds);
    if (ids.length > 0) {
      const { data: componentRows, error: componentError } =
        await getPublicClient()
          .from("product_components")
          .select(
            `parent_product_id, component_group, is_required, component_product_id,
						 products!product_components_component_product_id_fkey(
							product_variants(id, variant_name, price_adjustment, thumbnail, stock_quantity, is_pre_order, pre_order_config)
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

    // ── Recompute kit stock from component variant data ─────────────
    // shapeRow falls back to products.stock_quantity for kits with no
    // direct product_variants, which may be stale/wrong. Recompute
    // using the same logic as getProductListByFilters/computeKitStockById.
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

      // Keep sold_out tag in sync
      product.tags = product.tags.filter((t) => t.value !== "sold_out");
      if (product.stock_quantity === 0) {
        product.tags.unshift({
          id: 1,
          label: "Hết hàng",
          value: "sold_out",
        });
      }
    }

    // Sync activeProduct reference after stock recomputation
    if (activeProduct) {
      const refreshed = products.find((p) => p.id === activeProduct!.id);
      if (refreshed) activeProduct = refreshed;
    }

    // Fetch rules for all kit products
    const kitIds = Object.keys(configuratorByProductId);
    const rulesByProductId: Record<string, ComponentVariantRule[]> = {};
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
}
);

/**
 * Fetch the N newest products for use in server components.
 * Cached with React.cache() (per‑render deduplication) + Redis (cross‑request, 120s TTL).
 */
export const getNewestProducts = cache(async function getNewestProducts(
  limit: number
): Promise<ShopProduct[]> {
  try {
    const cached = await getCache<ShopProduct[]>(`newest-products:${limit}`);
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

    await setCache(`newest-products:${limit}`, products, 120);
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
        `fbt:${productId}:${limit}`
      );
      if (cached) return cached;

      const { data: sameOrders } = await getPublicClient()
        .from("order_items")
        .select("order_id")
        .eq("product_id", productId);

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

      await setCache(`fbt:${productId}:${limit}`, result, 300);
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
  async function getProductPurchaseCount(
    productId: string
  ): Promise<number> {
    try {
      const cached = await getCache<number>(
        `purchase-count:${productId}`
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

      await setCache(`purchase-count:${productId}`, count, 300);
      return count;
    } catch {
      return 0;
    }
  }
);

/**
 * Fetch a product by slug with its selectable component groups for the
 * interactive product detail page.
 *
 * Three-step query:
 *   1. Parent product by slug  (via getProductBySlug)
 *   2. Child products where product_type = 'component', linked via product_components
 *   3. product_variants for each child product (fetched in step 2)
 *
 * Returns { product, componentGroups } ready for ProductView.
 */
export async function getProductDetail(slug: string): Promise<{
  product: ProductDetail;
  componentGroups: ConfiguratorGroup[];
  componentRules: ComponentVariantRule[];
} | null> {
  try {
    // Step 1: Get parent product (reuses existing fetcher)
    const product = await getProductBySlug(slug);
    if (!product) return null;

    const compIds = product.components.map((c) => c.component_product.id);
    if (compIds.length === 0) {
      return { product, componentGroups: [], componentRules: [] };
    }

    // Steps 2 & 3: Query child products filtered to product_type = 'component',
    // including their product_variants in the same call.
    type ChildRow = {
      id: string;
      product_variants: Array<{
        id: string;
        variant_name: string;
        price_adjustment: number;
        thumbnail: string | null;
        stock_quantity: number;
        is_pre_order: boolean;
        pre_order_config: unknown;
        attributes: unknown;
      }>;
    };

    const { data: childRows, error } = await getPublicClient()
      .from("products")
      .select(
        `id,
				 is_active,
				 product_variants(id, variant_name, price_adjustment, thumbnail, stock_quantity, is_pre_order, pre_order_config)`
      )
      .eq("is_active", true)
      .in("id", compIds)
      .eq("product_type", "component");

    if (error) {
      console.error("[getProductDetail] child products error:", error.message);
      return { product, componentGroups: [], componentRules: [] };
    }

    const childById = new Map<string, ChildRow>(
      ((childRows ?? []) as unknown as ChildRow[]).map((r) => [r.id, r])
    );

    // Group component links by component_group, collecting selectable variants
    // from each matched child product.
    const groupMap = new Map<string, ConfiguratorGroup>();

    for (const comp of product.components) {
      const child = childById.get(comp.component_product.id);
      if (!child) continue; // not a 'component' type product — skip

      if (!groupMap.has(comp.component_group)) {
        groupMap.set(comp.component_group, {
          component_group: comp.component_group,
          is_required: comp.is_required,
          variants: [],
        });
      }

      const group = groupMap.get(comp.component_group)!;
      for (const v of child.product_variants ?? []) {
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

    // Fetch conditional variant rules
    const { data: ruleRows } = await getPublicClient()
      .from("component_variant_rules")
      .select(
        `id, condition_variant_id, target_component_product_id,
				 component_variant_rule_allowed(variant_id)`
      )
      .eq("kit_product_id", product.id);

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

    return {
      product,
      componentGroups: Array.from(groupMap.values()),
      componentRules,
    };
  } catch (err) {
    console.error("[getProductDetail] Unexpected error:", err);
    return null;
  }
}

/**
 * Fetch a single product by slug for the product detail page.
 * Wrapped with React.cache() to deduplicate in-flight requests within
 * the same render pass (e.g. generateMetadata + page body).
 */
export const getProductBySlug = cache(async function getProductBySlug(
  slug: string
): Promise<ProductDetail | null> {
  try {
    const cached = await getCache<ProductDetail>(`product:slug:${slug}`);
    if (cached) return cached;

    const { data: product, error } = await getPublicClient()
      .from("products")
      .select(
        `id, slug, name, brand, description, base_price, stock_quantity, category_id, thumbnail, images, product_type, is_used, is_active, attributes, sale_ends_at, sold_count,
			 categories(id, name),
			 product_variants(id, variant_name, price_adjustment, thumbnail, stock_quantity, is_pre_order, pre_order_config, attributes),
				 product_components!product_components_parent_product_id_fkey(
				 	id, component_group, is_required, component_product_id
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

    let componentProducts: ShopProduct[] = [];
    if (compIds.length > 0) {
      const { data: compData } = await getPublicClient()
        .from("products")
        .select(
          `id, slug, name, base_price, stock_quantity, thumbnail, images, product_type, is_used, is_active,
			categories(id, name),
			product_variants(id, variant_name, price_adjustment, thumbnail, stock_quantity, attributes)`
        )
        .eq("is_active", true)
        .in("id", compIds);
      if (compData) {
        const emptySupplements: KitSupplement = {
          childVariantsByProductId: new Map(),
          kitStockById: new Map(),
        };
        componentProducts = (compData as unknown as RawListRow[]).map(
          (row) => shapeRow(row, emptySupplements)
        );
      }
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
        component_product: cp
          ? {
              id: cp.id,
              name: cp.name,
              slug: cp.slug,
              base_price: cp.base_price,
              thumbnail: cp.thumbnail,
              images: cp.images,
              variants: cp.variants,
            }
          : {
              id: c.component_product_id,
              name: "Unknown",
              slug: "",
              base_price: 0,
              thumbnail: null,
              images: null,
              variants: [],
            },
      };
    });

    // Fetch gift products
    const { data: giftRows } = await getPublicClient()
      .from("gift_products")
      .select("quantity, gift:gift_product_id!inner(name, slug, thumbnail)")
      .eq("product_id", raw.id);

    const gifts: ProductDetail["gifts"] =
      (
        giftRows as unknown as Array<{
          quantity: number;
          gift: { name: string; slug: string; thumbnail: string | null };
        }> | null
      )?.map((g) => ({
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
      description: raw.description ?? null,
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

    await setCache(`product:slug:${slug}`, productDetail, 60);
    return productDetail;
  } catch (err) {
    console.error("[getProductBySlug] Unexpected error:", err);
    return null;
  }
});
