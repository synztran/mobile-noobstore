import { getPublicClient } from "@/lib/supabase/public";

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
  is_used: boolean;
  is_pre_order: boolean;
  tags: ProductTag[];
  discount_price: number;
  discount_percentage: number;
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

type VariantRow = {
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

type KitSupplement = {
  childVariantsByProductId: Map<string, VariantRow[]>;
  kitStockById: Map<string, number>;
};

type GiftSupplement = Map<
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

async function fetchKitSupplements(kitIds: string[]): Promise<KitSupplement> {
  const childVariantsByProductId = new Map<string, VariantRow[]>();
  const kitStockById = new Map<string, number>();

  if (kitIds.length === 0) return { childVariantsByProductId, kitStockById };

  const supabase = getPublicClient();

  // 1. Fetch child component products (linked via parent_product_id) + their variants
  const { data: children } = await supabase
    .from("products")
    .select(`id, parent_product_id, product_variants(${VARIANT_COLUMNS})`)
    .eq("is_active", true)
    .eq("product_type", "component")
    .in("parent_product_id", kitIds);

  if (children) {
    for (const row of children as unknown as ComponentChildRow[]) {
      if (row.product_variants && row.parent_product_id) {
        const existing =
          childVariantsByProductId.get(row.parent_product_id) ?? [];
        existing.push(...row.product_variants);
        childVariantsByProductId.set(row.parent_product_id, existing);
      }
    }
  }

  // 2. Fetch required component links for stock computation
  const { data: links } = await supabase
    .from("product_components")
    .select("parent_product_id, component_product_id, is_required")
    .in("parent_product_id", kitIds)
    .eq("is_required", true);

  if (links && links.length > 0) {
    const componentIds = Array.from(
      new Set(
        links
          .map((l) => l.component_product_id)
          .filter((id): id is string => !!id)
      )
    );

    const { data: componentRows } = await supabase
      .from("products")
      .select(`id, product_variants(stock_quantity)`)
      .eq("is_active", true)
      .in("id", componentIds);

    const componentStock = new Map<string, number>();
    if (componentRows) {
      for (const row of componentRows as unknown as ComponentChildRow[]) {
        const stock = (row.product_variants ?? []).reduce(
          (sum, v) => sum + Number(v.stock_quantity ?? 0),
          0
        );
        componentStock.set(row.id, stock);
      }
    }

    const childrenByParent = new Map<string, string[]>();
    for (const link of links) {
      if (!link.component_product_id || !link.parent_product_id) continue;
      const list = childrenByParent.get(link.parent_product_id) ?? [];
      list.push(link.component_product_id);
      childrenByParent.set(link.parent_product_id, list);
    }

    for (const [parentId, childIds] of childrenByParent) {
      const stocks = childIds.map((id) => componentStock.get(id) ?? 0);
      kitStockById.set(parentId, stocks.length > 0 ? Math.min(...stocks) : 0);
    }
  }

  return { childVariantsByProductId, kitStockById };
}

async function fetchGiftSupplement(
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
  kitSupplements: KitSupplement
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

  // 3. Pricing
  const computedMinPrice =
    variants.length > 0
      ? Math.min(...variants.map((v) => v.effective_price))
      : basePrice;

  const minPrice =
    computedMinPrice === 0 && basePrice > 0 ? basePrice : computedMinPrice;

  if (computedMinPrice === 0 && basePrice > 0) {
    console.warn(
      `[shapeRow] min_price clamped for ${row.id} (${row.name}): basePrice=${basePrice}, variants=${variants.length}`,
      variants.map((v) => ({
        name: v.variant_name,
        adj: v.price_adjustment,
        eff: v.effective_price,
      }))
    );
  }

  const discountPercentage =
    minPrice < basePrice
      ? Math.round(((basePrice - minPrice) / basePrice) * 100)
      : 0;

  // 4. Stock
  const productType = (row.product_type ?? "standard") as ProductType;
  let effectiveStock = Number(row.stock_quantity ?? 0);

  if (productType === "kit") {
    const kitStock = kitSupplements.kitStockById.get(row.id);
    effectiveStock =
      typeof kitStock === "number"
        ? kitStock
        : variants.length > 0
          ? Math.min(...variants.map((v) => v.stock_quantity))
          : Number(row.stock_quantity ?? 0);
  } else if (productType === "component") {
    effectiveStock = variants.reduce((s, v) => s + v.stock_quantity, 0);
  }

  // 5. Build result
  const shaped: ProductListItem = {
    id: row.id,
    slug: row.slug,
    name: row.name,
    brand: row.brand ?? null,
    category: row.categories?.name ?? "Unknown",
    description: row.description ?? "",
    base_price: basePrice,
    stock_quantity: effectiveStock,
    thumbnail: row.thumbnail,
    images: Array.isArray(row.images) ? (row.images as string[]) : null,
    product_type: productType,
    variants,
    min_price: minPrice,
    is_used: row.is_used ?? false,
    is_pre_order: variants.some((v) => v.is_pre_order),
    tags: [],
    discount_price: minPrice < basePrice ? minPrice : 0,
    discount_percentage: discountPercentage,
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

    const { count, error: countErr } = await countQuery;
    if (countErr || count === null) return { products: [], total: 0 };

    // ── Fetch paginated products (sorted by user's choice) ──
    const SELECT_COLUMNS = `id, slug, name, brand, base_price, stock_quantity, thumbnail, images, product_type, description, is_used, is_active, created_at, sold_count,
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

    const { data, error } = await dataQuery.range(
      safeOffset,
      safeOffset + safeLimit - 1
    );

    if (error || !data) return { products: [], total: 0 };

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
    let products = rows.map((row) => shapeRow(row, kitSupplements));

    // Strip components from shop display — they're only fetched for kit processing
    products = products.filter((p) => p.product_type !== "component");

    // ── Attach gifts ──
    const result = products.map((p) => ({
      ...p,
      gifts: giftsByProductId.get(p.id) ?? undefined,
    }));

    return { products: result, total: count };
  } catch {
    return { products: [], total: 0 };
  }
}
