import { getPublicClient } from "@/lib/supabase/public";

export type ProductSortOption = "newest" | "price_asc" | "price_desc";
export type ProductType = "standard" | "kit" | "component";

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
  /** True when at least one variant is on pre-order (denormalized from DB trigger) */
  is_pre_order: boolean;
  tags: ProductTag[];
  discount_price: number;
  discount_percentage: number;
  created_at: string;
}

type CategoryRow = { id: string } | null;
type VariantRow = {
  id: string;
  variant_name: string;
  price_adjustment: number;
  thumbnail: string | null;
  stock_quantity: number;
  is_pre_order: boolean;
  pre_order_config: unknown;
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
  categories: { id: string; name: string } | null;
  product_variants: VariantRow[] | null;
};

type ComponentLink = {
  parent_product_id: string;
  component_product_id: string;
  is_required: boolean;
};

type ComponentRow = {
  id: string;
  product_variants?: Array<{
    stock_quantity?: number;
  }> | null;
};

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

function getTags(product: ProductListItem): ProductTag[] {
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

  const currentDate = new Date();
  const createdDate = new Date(product.created_at);
  const diffInDays = Math.floor(
    (currentDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)
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

async function shapeRow(row: RawListRow): Promise<ProductListItem> {
  if (!row) throw new Error("Row is null or undefined");
  if (!row.product_variants) throw new Error("Row is missing product_variants");

  let variants = row.product_variants.map((variant) => ({
    ...variant,
    price_adjustment: Number(variant.price_adjustment),
    effective_price: Number(row.base_price) + Number(variant.price_adjustment),
    stock_quantity: Number(variant.stock_quantity ?? 0),
    pre_order_config:
      (variant.pre_order_config as PreOrderConfig | null) ?? null,
  }));

  // If kit, merge in all variants from child components
  if (row.product_type === "kit") {
    const supabase = getPublicClient();
    const { data: childComponents, error } = await supabase
      .from("products")
      .select(
        "id, product_variants(id, variant_name, price_adjustment, thumbnail, stock_quantity, is_pre_order, pre_order_config)"
      )
      .eq("parent_product_id", row.id)
      .eq("product_type", "component");
    if (!error && childComponents && childComponents.length > 0) {
      for (const comp of childComponents) {
        if (Array.isArray(comp.product_variants)) {
          for (const v of comp.product_variants) {
            variants.push({
              id: v.id,
              variant_name: v.variant_name,
              price_adjustment: Number(v.price_adjustment),
              effective_price:
                Number(row.base_price) + Number(v.price_adjustment),
              thumbnail: v.thumbnail,
              stock_quantity: Number(v.stock_quantity ?? 0),
              is_pre_order: v.is_pre_order ?? false,
              pre_order_config:
                (v.pre_order_config as PreOrderConfig | null) ?? null,
            });
          }
        }
      }
    }
  }

  const minPrice =
    variants.length > 0
      ? Math.min(...variants.map((variant) => variant.effective_price))
      : Number(row.base_price);

  const discountPercentage =
    minPrice < Number(row.base_price)
      ? Math.round(
          ((Number(row.base_price) - minPrice) / Number(row.base_price)) * 100
        )
      : 0;

  const productType = (row.product_type ?? "standard") as ProductType;
  let effectiveStock = Number(row.stock_quantity ?? 0);

  if (productType === "kit") {
    effectiveStock =
      variants.length > 0
        ? Math.min(...variants.map((variant) => variant.stock_quantity))
        : Number(row.stock_quantity ?? 0);
  } else if (productType === "component") {
    effectiveStock = variants.reduce(
      (sum, variant) => sum + variant.stock_quantity,
      0
    );
  }

  const shaped: ProductListItem = {
    ...row,
    category: row.categories?.name ?? "Unknown",
    base_price: Number(row.base_price),
    stock_quantity: effectiveStock,
    images: Array.isArray(row.images) ? (row.images as string[]) : null,
    product_type: productType,
    variants,
    min_price: minPrice,
    is_pre_order: variants.some((v) => v.is_pre_order),
    tags: [],
    discount_price: minPrice < Number(row.base_price) ? minPrice : 0,
    discount_percentage: discountPercentage,
  };

  shaped.tags = getTags(shaped);
  return shaped;
}

async function computeKitStockById(
  kitIds: string[]
): Promise<Map<string, number>> {
  const supabase = getPublicClient();
  const result = new Map<string, number>();

  if (kitIds.length === 0) return result;

  const { data: componentLinks, error: linkError } = await supabase
    .from("product_components")
    .select("parent_product_id, component_product_id, is_required")
    .in("parent_product_id", kitIds)
    .eq("is_required", true);

  if (linkError) return result;

  const links = (componentLinks ?? []) as ComponentLink[];
  const componentProductIds = Array.from(
    new Set(links.map((link) => link.component_product_id))
  );

  if (componentProductIds.length === 0) return result;

  const { data: componentRows, error: componentRowsError } = await supabase
    .from("products")
    .select("id, product_variants(stock_quantity)")
    .in("id", componentProductIds);

  if (componentRowsError) return result;

  const componentStockById = new Map<string, number>();
  for (const row of (componentRows ?? []) as ComponentRow[]) {
    const stock = (row.product_variants ?? []).reduce(
      (sum, variant) => sum + Number(variant.stock_quantity ?? 0),
      0
    );
    componentStockById.set(row.id, stock);
  }

  const childrenByParent = new Map<string, string[]>();
  for (const link of links) {
    const childIds = childrenByParent.get(link.parent_product_id) ?? [];
    childIds.push(link.component_product_id);
    childrenByParent.set(link.parent_product_id, childIds);
  }

  for (const [parentId, childIds] of childrenByParent) {
    const childStocks = childIds.map(
      (childId) => componentStockById.get(childId) ?? 0
    );
    result.set(parentId, childStocks.length > 0 ? Math.min(...childStocks) : 0);
  }

  return result;
}

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
    productTypes = ["standard", "kit", "component"],
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

    let categoryId: string | null = null;
    if (safeCategorySlug) {
      const { data: catRow } = await supabase
        .from("categories")
        .select("id")
        .eq("slug", safeCategorySlug)
        .maybeSingle();

      if (!catRow) return { products: [], total: 0 };
      categoryId = (catRow as CategoryRow)?.id ?? null;
    }

    let query = supabase
      .from("products")
      .select(
        `id, slug, name, brand, base_price, stock_quantity, thumbnail, images, product_type, description, is_used, created_at,
				 categories(id, name),
				 product_variants(id, variant_name, price_adjustment, thumbnail, stock_quantity, is_pre_order, pre_order_config)`
      )
      .in("product_type", productTypes);

    if (excludeUncategorized) query = query.not("category_id", "is", null);
    if (safeSearch) query = query.ilike("name", `%${safeSearch}%`);
    if (categoryId !== null) query = query.eq("category_id", categoryId);
    if (brand) query = query.eq("brand", brand);

    const { data, error } = await query;
    if (error) return { products: [], total: 0 };

    const rows = (data ?? []) as unknown as RawListRow[];
    const kitIds = rows
      .filter((row) => row.product_type === "kit")
      .map((row) => row.id);

    const kitStockById = await computeKitStockById(kitIds);

    let filteredProducts = await Promise.all(
      rows.map(async (row) => {
        const shaped = await shapeRow(row);
        if (row.product_type === "kit") {
          const stock = kitStockById.get(row.id);
          if (typeof stock === "number") {
            shaped.stock_quantity = stock;
            shaped.tags = getTags(shaped);
          }
        }
        return shaped;
      })
    );

    if (safePriceMin > 0 || safePriceMax > 0) {
      filteredProducts = filteredProducts.filter(
        (product) =>
          product.min_price >= safePriceMin &&
          (safePriceMax === 0 || product.min_price <= safePriceMax)
      );
    }

    // Sorting — out-of-stock always at bottom
    const inStock = filteredProducts.filter((p) => p.stock_quantity > 0);
    const outOfStock = filteredProducts.filter((p) => p.stock_quantity === 0);

    const sortFn =
      sort === "price_asc"
        ? (a: ProductListItem, b: ProductListItem) => a.min_price - b.min_price
        : sort === "price_desc"
          ? (a: ProductListItem, b: ProductListItem) => b.min_price - a.min_price
          : (a: ProductListItem, b: ProductListItem) =>
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime();

    inStock.sort(sortFn);
    outOfStock.sort(sortFn);
    filteredProducts = [...inStock, ...outOfStock];

    // Pagination
    const total = filteredProducts.length;
    const pagedProducts = filteredProducts.slice(
      safeOffset,
      safeOffset + safeLimit
    );

    return { products: pagedProducts, total };
  } catch {
    return { products: [], total: 0 };
  }
}
