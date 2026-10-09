import "server-only";

import { getPublicClient } from "@/lib/supabase/public";
import { resolveProductPricing } from "./pricing";
import { resolveEffectiveStock, resolveKitStockById } from "./stock";
import type { ComponentLink, StockNode } from "./stock";

export type ProductSortOption = "newest" | "price_asc" | "price_desc";
export type ProductType = "standard" | "kit" | "component" | "gift";

export interface ProductTag {
  id: number;
  label: string;
  value: string;
  icon?: string;
  textColor?: string;
  bgColor?: string;
}

export interface PreOrderConfig {
  estimate: string;
  available_date?: string | null;
  notes?: string | null;
}

export interface ProductVariant {
  id: string;
  variant_name: string;
  price_adjustment: number;
  effective_price: number;
  thumbnail: string | null;
  stock_quantity: number;
  is_pre_order: boolean;
  pre_order_config: PreOrderConfig | null;
  attributes: Record<string, string> | null;
}

export interface ProductListItem {
  id: string;
  slug: string;
  name: string;
  brand: string | null;
  category: string;
  description: string;
  base_price: number;
  stock_quantity: number;
  thumbnail: string | null;
  images: string[] | null;
  product_type: ProductType;
  variants: ProductVariant[];
  min_price: number;
  /** base_price + cheapest variant of every REQUIRED component (kits). */
  from_price: number;
  is_used: boolean;
  is_pre_order: boolean;
  tags: ProductTag[];
  discount_price: number;
  discount_percentage: number;
  sale_ends_at: string | null;
  created_at: string;
  sold_count: number;
  gifts?: Array<{
    gift_name: string;
    gift_slug: string;
    gift_thumbnail: string | null;
    quantity: number;
  }>;
}

// ─── Raw DB row types ──────────────────────────────────────────────────────────

export type VariantRow = {
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
  sale_ends_at: string | null;
  stock_quantity: number;
  thumbnail: string | null;
  images: unknown;
  product_type: string;
  is_used: boolean;
  is_pre_order: boolean;
  created_at: string;
  sold_count: number;
  categories: { id: string; name: string } | null;
  product_variants: VariantRow[] | null;
};

type ComponentChildRow = {
  id: string;
  parent_product_id: string | null;
  product_variants: VariantRow[] | null;
};

// ─── Supplement types (batch-fetched) ─────────────────────────────────────────

export type KitSupplement = {
  childVariantsByProductId: Map<string, VariantRow[]>;
  /** Per kit: sum of the cheapest variant price of every required component
   *  (`product_components.is_required = true`). Optional components excluded.
   *  Missing key = not a kit / no required component links. */
  requiredMinPriceByProductId: Map<string, number>;
  kitStockById: Map<string, number>;
};

export type GiftSupplement = Map<
  string,
  Array<{
    gift_name: string;
    gift_slug: string;
    gift_thumbnail: string | null;
    quantity: number;
  }>
>;

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

const VARIANT_COLUMNS = `id, variant_name, price_adjustment, thumbnail, stock_quantity, is_pre_order, pre_order_config, attributes`;

// ─── Pure helpers ─────────────────────────────────────────────────────────────

/**
 * Convert a product's full HTML description into a short plain-text excerpt.
 * The shop grid only renders a 3-line excerpt (ProductCardDetails clamps and
 * strips tags client-side), so shipping the full HTML (~70% of the list
 * payload) is wasted bytes that inflate the Redis read + response time.
 */
export function descriptionToExcerpt(html: string, maxLength = 160): string {
  if (!html) return "";
  const text = html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > maxLength
    ? `${text.slice(0, maxLength).trimEnd()}…`
    : text;
}

function parseVariant(v: VariantRow, basePrice: number): ProductVariant {
  return {
    id: v.id,
    variant_name: v.variant_name,
    price_adjustment: Number(v.price_adjustment),
    effective_price: basePrice + Number(v.price_adjustment),
    thumbnail: v.thumbnail,
    stock_quantity: Number(v.stock_quantity ?? 0),
    is_pre_order: v.is_pre_order ?? false,
    pre_order_config: (v.pre_order_config as PreOrderConfig | null) ?? null,
    attributes: (v.attributes as Record<string, string> | null) ?? null,
  };
}

function getTags(product: {
  is_pre_order: boolean;
  is_used: boolean;
  created_at: string;
}): ProductTag[] {
  const tags: ProductTag[] = [];

  if (product.is_pre_order) {
    tags.push({
      id: 3,
      label: "Đặt trước",
      value: "pre_order",
      textColor: "text-white",
      bgColor: "bg-violet-500",
    });
  }

  if (product.is_used) {
    tags.push({
      label: "Used",
      id: 2,
      value: "used_product",
      textColor: "text-white",
      bgColor: "bg-gray-500",
    });
  }

  const diffInDays = Math.floor(
    (Date.now() - new Date(product.created_at).getTime()) /
      (1000 * 60 * 60 * 24)
  );

  if (diffInDays <= 15) {
    tags.push({
      label: "Mới lên kệ",
      id: 1,
      value: "new_product",
      textColor: "text-white",
      bgColor: "bg-green-500",
    });
  }

  return tags;
}

// ─── Batch supplement fetchers ────────────────────────────────────────────────

/**
 * Resolve kit stock for a set of kits by walking the component closure.
 *
 * `resolveKitStockById` is recursive, so it needs every component product that
 * could participate — a required child can itself be a kit and resolve through
 * ITS components. We only deepen when a child actually IS a kit, so the common
 * single-level case costs exactly one extra query.
 *
 * Both stock surfaces call this:
 *   - `fetchKitSupplements` → /shop and /api/products
 *   - `ssr.ts` `getProductBySlugUncached` → /shop/[slug]
 * That shared call is what keeps the two from disagreeing. Before it existed,
 * /shop summed a child's variant rows while /shop/[slug] ran the child through
 * `resolveEffectiveStock` with an empty kit map, so a kit child collapsed to
 * `min(own variants)` — one product showed 3 on the listing and 1 on its page.
 *
 * `seedNodes` lets a caller pass rows it already fetched (the detail page has
 * its component rows in hand for rendering), avoiding a duplicate query.
 */
export async function fetchKitStockMap(opts: {
  seedLinks: ComponentLink[];
  seedNodes?: Map<string, StockNode>;
}): Promise<Map<string, number>> {
  const { seedLinks, seedNodes } = opts;
  const supabase = getPublicClient();

  const allLinks: ComponentLink[] = [...seedLinks];
  const allNodes = new Map<string, StockNode>(seedNodes ?? []);
  const seen = new Set<string>(allNodes.keys());

  let frontier = Array.from(
    new Set(
      allLinks
        .map((l) => l.component_product_id)
        .filter((id): id is string => typeof id === "string" && !!id),
    ),
  );

  // Real kits nest 1-2 deep. This bound only stops pathological data from
  // becoming an unbounded query loop — `resolveKitStockById`'s cycle guard is
  // what actually prevents infinite recursion.
  const MAX_KIT_DEPTH = 4;

  for (let depth = 0; depth < MAX_KIT_DEPTH && frontier.length > 0; depth++) {
    const fresh = frontier.filter((id) => !seen.has(id));
    for (const id of fresh) seen.add(id);
    if (fresh.length === 0) break;

    const { data: componentRows } = await supabase
      .from("products")
      .select(`id, product_type, stock_quantity, product_variants(stock_quantity)`)
      .eq("is_active", true)
      .in("id", fresh);

    for (const row of (componentRows ?? []) as unknown as Array<{
      id: string;
      product_type: string | null;
      stock_quantity: number | null;
      product_variants: Array<{ stock_quantity: number | null }> | null;
    }>) {
      allNodes.set(row.id, {
        id: row.id,
        product_type: row.product_type,
        stock_quantity: row.stock_quantity,
        variantStocks: (row.product_variants ?? []).map((v) =>
          Number(v.stock_quantity ?? 0),
        ),
      });
    }

    // Only descend into children that are kits themselves.
    frontier = fresh.filter(
      (id) => (allNodes.get(id)?.product_type ?? "standard") === "kit",
    );

    if (frontier.length > 0) {
      const { data: deeper } = await supabase
        .from("product_components")
        .select("parent_product_id, component_product_id, is_required")
        .in("parent_product_id", frontier);
      allLinks.push(...((deeper ?? []) as unknown as ComponentLink[]));
    }
  }

  return resolveKitStockById({ links: allLinks, nodes: allNodes });
}

export async function fetchKitSupplements(
  kitIds: string[]
): Promise<KitSupplement> {
  const childVariantsByProductId = new Map<string, VariantRow[]>();
  const requiredMinPriceByProductId = new Map<string, number>();

  if (kitIds.length === 0)
    return {
      childVariantsByProductId,
      requiredMinPriceByProductId,
      kitStockById: new Map<string, number>(),
    };

  const supabase = getPublicClient();

  // 1. Component links — decide which children are required for pricing/stock
  const { data: links } = await supabase
    .from("product_components")
    .select("parent_product_id, component_product_id, is_required")
    .in("parent_product_id", kitIds);

  const requiredChildIdsByParent = new Map<string, Set<string>>();
  for (const link of links ?? []) {
    if (
      !link.is_required ||
      !link.component_product_id ||
      !link.parent_product_id
    )
      continue;
    const list =
      requiredChildIdsByParent.get(link.parent_product_id) ?? new Set();
    list.add(link.component_product_id);
    requiredChildIdsByParent.set(link.parent_product_id, list);
  }

  // 2. Fetch child component products (linked via parent_product_id) + their variants
  const { data: children } = await supabase
    .from("products")
    .select(`id, parent_product_id, product_variants(${VARIANT_COLUMNS})`)
    .eq("is_active", true)
    .eq("product_type", "component")
    .in("parent_product_id", kitIds);

  const childrenById = new Map<string, ComponentChildRow>();
  if (children) {
    for (const row of children as unknown as ComponentChildRow[]) {
      if (!row.parent_product_id) continue;
      const existing =
        childVariantsByProductId.get(row.parent_product_id) ?? [];
      if (row.product_variants) existing.push(...row.product_variants);
      childVariantsByProductId.set(row.parent_product_id, existing);
      childrenById.set(row.id, row);
    }
  }

  // 3. "Giá chỉ từ" for kits = sum of each required component's cheapest variant
  for (const [parentId, requiredChildIds] of requiredChildIdsByParent) {
    let sum = 0;
    for (const childId of requiredChildIds) {
      const childRow = childrenById.get(childId);
      const prices = (childRow?.product_variants ?? [])
        .map((v) => Number(v.price_adjustment ?? 0))
        .filter((p) => p > 0);
      if (prices.length > 0) sum += Math.min(...prices);
    }
    requiredMinPriceByProductId.set(parentId, sum);
  }

  const kitStockById = await fetchKitStockMap({
    seedLinks: (links ?? []) as unknown as ComponentLink[],
  });

  return {
    childVariantsByProductId,
    requiredMinPriceByProductId,
    kitStockById,
  };
}

export async function fetchGiftSupplement(
  productIds: string[]
): Promise<GiftSupplement> {
  const giftsByProductId: GiftSupplement = new Map();

  if (productIds.length === 0) return giftsByProductId;

  const { data: giftData } = await getPublicClient()
    .from("gift_products")
    .select(
      `product_id, quantity, gift:gift_product_id!inner(name, slug, thumbnail)`
    )
    .in("product_id", productIds);

  if (giftData) {
    for (const g of giftData as unknown as Array<{
      product_id: string;
      quantity: number;
      gift: { name: string; slug: string; thumbnail: string | null } | null;
    }>) {
      if (!g.gift) continue;
      const list = giftsByProductId.get(g.product_id) ?? [];
      list.push({
        gift_name: g.gift.name,
        gift_slug: g.gift.slug,
        gift_thumbnail: g.gift.thumbnail,
        quantity: g.quantity,
      });
      giftsByProductId.set(g.product_id, list);
    }
  }

  return giftsByProductId;
}

// ─── Pure shapeRow (no side effects) ──────────────────────────────────────────

function shapeRow(
  row: RawListRow,
  kitSupplements: KitSupplement,
  slim = false
): ProductListItem {
  const basePrice = Number(row.base_price);

  // 1. Parse direct variants
  const variants = (row.product_variants ?? []).map((v) =>
    parseVariant(v, basePrice)
  );

  // 2. For kit products, merge in child component variants
  const childVariants =
    row.product_type === "kit"
      ? (kitSupplements.childVariantsByProductId.get(row.id) ?? [])
      : [];

  for (const cv of childVariants) {
    variants.push(parseVariant(cv, basePrice));
  }

  // 3. Pricing — `min_price` is the cheapest single variant across everything;
  //    `from_price` is what a kit starts from = base + cheapest variant of each
  //    REQUIRED component (optional components excluded). Quantity tiers
  //    (e.g. 70 / 90 / 110 packs) are ordinary variants, so they need no
  //    special casing — the shared helper reads them the same way.
  const requiredMinPrice = kitSupplements.requiredMinPriceByProductId.get(
    row.id
  );

  const pricing = resolveProductPricing({
    basePrice,
    variants,
    kitFromPrice:
      row.product_type === "kit" && requiredMinPrice !== undefined
        ? basePrice + requiredMinPrice
        : undefined,
  });
  const { min_price: minPrice, from_price: fromPrice } = pricing;

  if (pricing.unpriced) {
    console.warn(
      `[shapeRow] no priced variant for ${row.id} (${row.name}): basePrice=${basePrice}, variants=${variants.length}`,
      variants.map((v) => ({
        name: v.variant_name,
        adj: v.price_adjustment,
        eff: v.effective_price,
      }))
    );
  }

  // 4. Stock — shared with ssr.ts so /api/products and /shop agree.
  const productType = (row.product_type ?? "standard") as ProductType;
  const effectiveStock = resolveEffectiveStock({
    productType,
    productId: row.id,
    productStock: row.stock_quantity,
    variants,
    kitStockById: kitSupplements.kitStockById,
  });

  // 5. Build result — is_pre_order logic differs by product type
  const is_pre_order =
    productType === "kit"
      ? variants.some((v) => v.is_pre_order)
      : (row.is_pre_order ?? false);

  // 6. Always return all variants — ProductCard swatches need the full list
  //    to render variant options. Kits still get the full list for the drawer.
  const slimVariants = variants;

  const shaped: ProductListItem = {
    id: row.id,
    slug: row.slug,
    name: row.name,
    brand: row.brand ?? null,
    category: row.categories?.name ?? "Unknown",
    description: slim
      ? descriptionToExcerpt(row.description ?? "")
      : (row.description ?? ""),
    base_price: basePrice,
    stock_quantity: effectiveStock,
    thumbnail: row.thumbnail,
    images: Array.isArray(row.images) ? (row.images as string[]) : null,
    product_type: productType,
    variants: slimVariants,
    min_price: minPrice,
    from_price: fromPrice,
    is_used: row.is_used ?? false,
    is_pre_order,
    tags: [],
    discount_price: pricing.discount_price,
    discount_percentage: pricing.discount_percentage,
    sale_ends_at: row.sale_ends_at ?? null,
    created_at: row.created_at,
    sold_count: Number(row.sold_count ?? 0),
  };

  shaped.tags = getTags(shaped);
  return shaped;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface GetProductListParams {
  search?: string;
  categorySlug?: string;
  brand?: string;
  priceMin?: number;
  priceMax?: number;
  sort?: ProductSortOption;
  limit?: number;
  offset?: number;
  productTypes?: ProductType[];
  excludeUncategorized?: boolean;
  /** Trim list payload: excerpt description, keep one variant for standards. */
  slim?: boolean;
  /**
   * Sink sold-out products below every available one, preserving the requested
   * sort order WITHIN each group. Opt-in: only /shop and /api/products set it.
   *
   * Availability is DERIVED (see ./stock.ts), so SQL cannot filter or order by
   * it — `products.stock_quantity` is NULL for every kit and every
   * variant-bearing product. With this on we therefore skip SQL pagination,
   * shape every matching row, partition, then slice in JS.
   */
  soldOutLast?: boolean;
}

/**
 * Hard ceiling on rows scanned when `soldOutLast` is set — partitioning needs
 * to see every matching row, so this bounds the extra work. The sellable
 * catalogue is ~50 products today (158 including components and gifts), so the
 * common case never approaches it. If it ever does, we log and fall back to
 * plain SQL pagination rather than silently truncating results.
 */
const SOLD_OUT_LAST_SCAN_CAP = 400;

/**
 * Stable partition: available rows first, sold-out rows after, each keeping its
 * incoming (SQL-sorted) order. Pure — does not mutate the input.
 *
 * Anything at or below zero counts as sold out, including NULL, which is the
 * raw column value for most of the catalogue; callers pass DERIVED stock, so a
 * genuine NULL should not reach here.
 */
export function partitionSoldOutLast<T extends { stock_quantity: number }>(
  rows: T[],
): T[] {
  const available: T[] = [];
  const soldOut: T[] = [];
  for (const row of rows) {
    if (Number(row.stock_quantity ?? 0) > 0) available.push(row);
    else soldOut.push(row);
  }
  return [...available, ...soldOut];
}

export async function getProductListByFilters(
  params: GetProductListParams = {}
): Promise<{ products: ProductListItem[]; total: number }> {
  const {
    search = "",
    categorySlug = "",
    brand = "",
    priceMin = 0,
    priceMax = 0,
    sort = "newest",
    limit,
    offset = 0,
    // productTypes = ["standard", "kit", "component"],
    excludeUncategorized = false,
    slim = false,
    soldOutLast = false,
  } = params;

  const safeSearch = search.trim().slice(0, 100);
  const safeCategorySlug = categorySlug.trim().slice(0, 100);
  const safePriceMin = Math.max(0, Number(priceMin) || 0);
  const safePriceMax = Math.max(0, Number(priceMax) || 0);
  const safeOffset = Math.max(0, Number(offset) || 0);
  const safeLimit =
    typeof limit === "number"
      ? Math.min(Math.max(1, Math.floor(limit)), MAX_LIMIT)
      : DEFAULT_LIMIT;

  try {
    const supabase = getPublicClient();

    // ── Resolve category ──
    let categoryId: string | null = null;
    if (safeCategorySlug) {
      const { data: catRow } = await supabase
        .from("categories")
        .select("id")
        .eq("slug", safeCategorySlug)
        .maybeSingle();

      if (!catRow) return { products: [], total: 0 };
      categoryId = catRow?.id ?? null;
    }

    // ── Build base filter helpers ──
    const applyFilters = (q: any) => {
      let r = q
        .eq("is_active", true)
        .neq("product_type", "gift")
        .in("product_type", ["standard", "kit"]);
      if (excludeUncategorized) r = r.not("category_id", "is", null);
      if (safeSearch) r = r.ilike("name", `%${safeSearch}%`);
      if (categoryId !== null) r = r.eq("category_id", categoryId);
      if (brand) r = r.eq("brand", brand);
      if (safePriceMin > 0) r = r.gte("base_price", safePriceMin);
      if (safePriceMax > 0) r = r.lte("base_price", safePriceMax);
      return r;
    };

    // ── Count total (standard + kit only; components are stripped from result) ──
    let countQuery = supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true)
      .neq("product_type", "gift")
      .in("product_type", ["standard", "kit"]);
    if (excludeUncategorized)
      countQuery = countQuery.not("category_id", "is", null);
    if (safeSearch) countQuery = countQuery.ilike("name", `%${safeSearch}%`);
    if (categoryId !== null)
      countQuery = countQuery.eq("category_id", categoryId);
    if (brand) countQuery = countQuery.eq("brand", brand);
    if (safePriceMin > 0)
      countQuery = countQuery.gte("base_price", safePriceMin);
    if (safePriceMax > 0)
      countQuery = countQuery.lte("base_price", safePriceMax);

    // ── Fetch paginated products (sorted by user's choice) ──
    // Note: `images` is intentionally omitted — the list rails/cards only use
    // `thumbnail`; the full gallery is fetched by the detail/configurator paths.
    const SELECT_COLUMNS = `id, slug, name, brand, base_price, stock_quantity, thumbnail, product_type, description, is_used, is_active, is_pre_order, created_at, sold_count, sale_ends_at,
       categories(id, name),
       product_variants(${VARIANT_COLUMNS})`;

    let dataQuery = applyFilters(
      supabase.from("products").select(SELECT_COLUMNS)
    );

    if (sort === "newest") {
      dataQuery = dataQuery.order("created_at", { ascending: false });
    } else if (sort === "price_asc") {
      dataQuery = dataQuery.order("base_price", { ascending: true });
    } else if (sort === "price_desc") {
      dataQuery = dataQuery.order("base_price", { ascending: false });
    }
    dataQuery = dataQuery.order("id", { ascending: true });

    // `soldOutLast` cannot paginate in SQL: availability is derived in JS (see
    // ./stock.ts) and the column SQL would sort on is NULL for most of the
    // catalogue. So fetch the whole result set and slice after partitioning.
    // Whether that is possible depends on the row count, which the count query
    // gives us — so run the two in parallel and choose the range afterwards is
    // not possible; instead we always over-fetch when the flag is on and
    // re-slice below. Without the flag this is plain SQL pagination.
    const dataRange = soldOutLast
      ? dataQuery.range(0, SOLD_OUT_LAST_SCAN_CAP - 1)
      : dataQuery.range(safeOffset, safeOffset + safeLimit - 1);

    // Count and data are independent once categoryId is resolved — run them
    // in parallel to cut one full round-trip off every list request.
    const [{ count, error: countErr }, { data, error }] = await Promise.all([
      countQuery,
      dataRange,
    ]);
    if (countErr || count === null) return { products: [], total: 0 };
    if (error || !data) return { products: [], total: 0 };

    // Only partition when we genuinely hold every matching row; otherwise the
    // "available first" guarantee would silently break on a truncated set.
    const canPartition = soldOutLast && count <= SOLD_OUT_LAST_SCAN_CAP;
    if (soldOutLast && !canPartition) {
      console.warn(
        `[getProductListByFilters] soldOutLast NOT applied: ${count} rows exceeds SOLD_OUT_LAST_SCAN_CAP (${SOLD_OUT_LAST_SCAN_CAP}); ordering by availability skipped to avoid truncating results.`,
      );
    }

    const rows = data as unknown as RawListRow[];

    // ── Batch-fetch supplements ──
    const kitIds = rows
      .filter((r) => r.product_type === "kit")
      .map((r) => r.id);

    const [kitSupplements, giftsByProductId] = await Promise.all([
      fetchKitSupplements(kitIds),
      fetchGiftSupplement(rows.map((r) => r.id)),
    ]);

    // ── Shape rows (pure) ──
    let products = rows.map((row) => shapeRow(row, kitSupplements, slim));

    // Strip components from shop display — they're only fetched for kit processing
    products = products.filter((p) => p.product_type !== "component");

    // ── Attach gifts ──
    let result = products.map((p) => ({
      ...p,
      gifts: giftsByProductId.get(p.id) ?? undefined,
    }));

    // ── Sold-out-last ordering (opt-in) ──
    // Availability is only known now, so this has to happen after shaping.
    // Slice here because the range() above returned the whole set, not a page.
    if (canPartition) {
      result = partitionSoldOutLast(result).slice(
        safeOffset,
        safeOffset + safeLimit,
      );
    }

    return { products: result, total: count };
  } catch {
    return { products: [], total: 0 };
  }
}

/**
 * Fetch active, sellable products by their ids (standard + kit only).
 * Returns only the products that exist and are active; archived/removed
 * ids are omitted from the result. Used to hydrate recently-viewed entries.
 */
export async function getProductsByIds(
  ids: string[]
): Promise<ProductListItem[]> {
  const safeIds = ids.filter((id) => typeof id === "string" && id.length > 0);
  if (safeIds.length === 0) return [];

  const SELECT_COLUMNS = `id, slug, name, brand, base_price, stock_quantity, thumbnail, product_type, description, is_used, is_active, is_pre_order, created_at, sold_count, sale_ends_at,
     categories(id, name),
     product_variants(${VARIANT_COLUMNS})`;

  try {
    const supabase = getPublicClient();

    const { data, error } = await supabase
      .from("products")
      .select(SELECT_COLUMNS)
      .in("id", safeIds)
      .eq("is_active", true)
      .neq("product_type", "gift")
      .in("product_type", ["standard", "kit"]);

    if (error || !data) return [];

    const rows = data as unknown as RawListRow[];

    const kitIds = rows
      .filter((r) => r.product_type === "kit")
      .map((r) => r.id);

    const [kitSupplements, giftsByProductId] = await Promise.all([
      fetchKitSupplements(kitIds),
      fetchGiftSupplement(rows.map((r) => r.id)),
    ]);

    const products = rows
      .map((row) => shapeRow(row, kitSupplements))
      .filter((p) => p.product_type !== "component")
      .map((p) => ({
        ...p,
        gifts: giftsByProductId.get(p.id) ?? undefined,
      }));

    return products;
  } catch {
    return [];
  }
}
