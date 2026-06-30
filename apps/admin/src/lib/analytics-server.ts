import { getAdminClient } from "@/lib/supabase/admin";

export interface MonthlyRevenue {
  month: string;
  revenue: number;
}

export interface MonthlyOrders {
  month: string;
  products: number;
  services: number;
}

export interface MonthlyReviews {
  month: string;
  avgRating: number;
  count: number;
}

export interface RatingDistribution {
  rating: number;
  count: number;
}

export interface TrackingDataPoint {
  month: string;
  delivered: number;
  inTransit: number;
  cancelled: number;
}

const MONTH_NAMES = [
  "T1", "T2", "T3", "T4", "T5", "T6",
  "T7", "T8", "T9", "T10", "T11", "T12",
];

function monthLabel(dateStr: string | null): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return MONTH_NAMES[d.getMonth()] ?? "";
}

function reviewsDb() {
  return (getAdminClient() as any).from("product_reviews");
}

export async function getRevenueData(): Promise<MonthlyRevenue[]> {
  const supabase = getAdminClient();

  const { data, error } = await supabase
    .from("orders")
    .select("total_price, created_at")
    .in("status", ["delivered", "confirmed"])
    .gte("created_at", new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString());

  if (error || !data) return generateEmptyMonths<MonthlyRevenue>(12);

  const byMonth = new Map<string, number>();
  for (const row of data) {
    if (!row.created_at) continue;
    const label = monthLabel(row.created_at);
    byMonth.set(label, (byMonth.get(label) || 0) + Number(row.total_price));
  }

  return generateEmptyMonths<MonthlyRevenue>(12).map((m) => ({
    ...m,
    revenue: byMonth.get(m.month) || 0,
  }));
}

export async function getOrdersData(): Promise<MonthlyOrders[]> {
  const supabase = getAdminClient();

  const [ordersRes, serviceOrdersRes] = await Promise.all([
    supabase
      .from("orders")
      .select("created_at, id")
      .gte("created_at", new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString()),
    supabase
      .from("order_services")
      .select("order_id")
  ]);

  const orders = ordersRes.data || [];
  const serviceRows = serviceOrdersRes.data || [];

  const serviceOrderIds = new Set(serviceRows.map((r) => r.order_id));

  const productByMonth = new Map<string, number>();
  const serviceByMonth = new Map<string, number>();

  for (const row of orders) {
    if (!row.created_at) continue;
    const label = monthLabel(row.created_at);
    if (serviceOrderIds.has(row.id)) {
      serviceByMonth.set(label, (serviceByMonth.get(label) || 0) + 1);
    } else {
      productByMonth.set(label, (productByMonth.get(label) || 0) + 1);
    }
  }

  return generateEmptyMonths<MonthlyOrders>(12).map((m) => ({
    ...m,
    products: productByMonth.get(m.month) || 0,
    services: serviceByMonth.get(m.month) || 0,
  }));
}

export async function getReviewsData(): Promise<MonthlyReviews[]> {
  const { data, error } = await reviewsDb()
    .select("rating, created_at")
    .gte("created_at", new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString()) as any;

  if (error || !data) return generateEmptyMonths<MonthlyReviews>(12);

  const rows = data as Array<{ rating: number; created_at: string }>;
  const byMonth = new Map<string, { total: number; count: number }>();
  for (const row of rows) {
    const label = monthLabel(row.created_at);
    const prev = byMonth.get(label) || { total: 0, count: 0 };
    prev.total += row.rating;
    prev.count += 1;
    byMonth.set(label, prev);
  }

  return generateEmptyMonths<MonthlyReviews>(12).map((m) => {
    const stats = byMonth.get(m.month);
    return {
      ...m,
      avgRating: stats ? +(stats.total / stats.count).toFixed(1) : 0,
      count: stats?.count || 0,
    };
  });
}

export async function getRatingDistribution(): Promise<RatingDistribution[]> {
  const { data, error } = await reviewsDb().select("rating") as any;

  if (error || !data) {
    return [1, 2, 3, 4, 5].map((r) => ({ rating: r, count: 0 }));
  }

  const rows = data as Array<{ rating: number }>;
  const counts = new Map<number, number>();
  for (const row of rows) {
    counts.set(row.rating, (counts.get(row.rating) || 0) + 1);
  }

  return [1, 2, 3, 4, 5].map((r) => ({
    rating: r,
    count: counts.get(r) || 0,
  }));
}

export function getTrackingData(): TrackingDataPoint[] {
  return [
    { month: "T1", delivered: 0, inTransit: 0, cancelled: 0 },
    { month: "T2", delivered: 0, inTransit: 0, cancelled: 0 },
    { month: "T3", delivered: 0, inTransit: 0, cancelled: 0 },
    { month: "T4", delivered: 0, inTransit: 0, cancelled: 0 },
    { month: "T5", delivered: 0, inTransit: 0, cancelled: 0 },
    { month: "T6", delivered: 0, inTransit: 0, cancelled: 0 },
    { month: "T7", delivered: 0, inTransit: 0, cancelled: 0 },
    { month: "T8", delivered: 0, inTransit: 0, cancelled: 0 },
    { month: "T9", delivered: 0, inTransit: 0, cancelled: 0 },
    { month: "T10", delivered: 0, inTransit: 0, cancelled: 0 },
    { month: "T11", delivered: 0, inTransit: 0, cancelled: 0 },
    { month: "T12", delivered: 0, inTransit: 0, cancelled: 0 },
  ];
}

export interface OutOfStockItem {
  id: string;
  name: string;
  slug: string;
  thumbnail: string | null;
  productType: string;
  effectiveStock: number;
}

export async function getOutOfStockProducts(): Promise<OutOfStockItem[]> {
  const supabase = getAdminClient();

  const [productsRes, variantsRes, componentsRes] = await Promise.all([
    supabase
      .from("products")
      .select("id, name, slug, thumbnail, product_type, stock_quantity")
      .eq("is_active", true),
    supabase
      .from("product_variants")
      .select("id, product_id, stock_quantity"),
    supabase
      .from("product_components")
      .select("parent_product_id, component_product_id, is_required"),
  ]);

  const products = productsRes.data || [];
  const variants = variantsRes.data || [];
  const components = componentsRes.data || [];

  const variantsByProduct = new Map<string, number[]>();
  for (const v of variants) {
    if (!v.product_id) continue;
    const list = variantsByProduct.get(v.product_id) || [];
    list.push(v.stock_quantity ?? 0);
    variantsByProduct.set(v.product_id, list);
  }

  const componentProductIds = new Set(
    components.map((c) => c.component_product_id).filter(Boolean) as string[]
  );

  const stockCache = new Map<string, number>();

  function getEffectiveStock(productId: string): number {
    const cached = stockCache.get(productId);
    if (cached !== undefined) return cached;

    const product = products.find((p) => p.id === productId);
    if (!product) return 0;

    let stock: number;
    if (product.product_type === "component") {
      const vs = variantsByProduct.get(productId) || [];
      stock = vs.reduce((s, q) => s + q, 0);
    } else if (product.product_type === "kit") {
      const requiredComps = components.filter(
        (c) => c.parent_product_id === productId && c.is_required
      );
      if (requiredComps.length > 0) {
        stock = Math.min(
          ...requiredComps.map(
            (c) =>
              c.component_product_id ? getEffectiveStock(c.component_product_id) : 0
          )
        );
      } else {
        stock = Number(product.stock_quantity ?? 0);
      }
    } else {
      stock = Number(product.stock_quantity ?? 0);
    }

    stockCache.set(productId, stock);
    return stock;
  }

  const result: OutOfStockItem[] = [];

  for (const p of products) {
    if (componentProductIds.has(p.id)) continue;

    const stock = getEffectiveStock(p.id);
    if (stock === 0) {
      result.push({
        id: p.id,
        name: p.name,
        slug: p.slug,
        thumbnail: p.thumbnail,
        productType: p.product_type ?? "standard",
        effectiveStock: stock,
      });
    }
  }

  return result.sort((a, b) => a.name.localeCompare(b.name));
}

function generateEmptyMonths<T>(count: number): ({ month: string } & T)[] {
  const now = new Date();
  const result: ({ month: string } & T)[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    result.push({ month: MONTH_NAMES[d.getMonth()] } as ({ month: string } & T));
  }
  return result;
}
