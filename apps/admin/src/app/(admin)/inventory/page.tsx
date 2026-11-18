import InventoryClient from "@/components/inventory/InventoryClient";
import type { InboundBatch } from "@/components/inventory/InboundReviewModal";
import { getAdminClient } from "@/lib/supabase/admin";
// Canonical variant-authoritative stock rule, shared with the storefront
// (/shop, /api/products, cart availability and the submit_order RPC). Pure
// module with no imports — safe to reuse here. Do NOT re-implement it; if the
// rule changes it must change for both apps at once.
import { resolveEffectiveStock } from "@web-stock";

export const metadata = {
  title: "Inventory - NoobStore Admin",
};

interface InventoryProduct {
  id: string;
  name: string;
  slug: string;
  thumbnail: string | null;
  product_type: string;
  stock_quantity: number;
  base_price: number;
  is_active: boolean;
  categories: { id: string; name: string } | null;
  product_variants: {
    id: string;
    variant_name: string;
    stock_quantity: number;
    price_adjustment: number | null;
  }[];
  /**
   * Sellable stock, computed with the storefront's own rule. For kits and any
   * product with variants this is derived from variant rows, and the raw
   * `stock_quantity` column is not what customers can actually buy.
   */
  effective_stock: number;
  /** True when variant rows (or components, for a kit) own the stock. */
  stock_is_derived: boolean;
}

type RawProduct = {
  id: string;
  name: string;
  slug: string;
  thumbnail: string | null;
  product_type: string;
  stock_quantity: number | null;
  base_price: number;
  is_active: boolean;
  categories: { id: string; name: string } | null;
  product_variants: Array<{
    id: string;
    variant_name: string;
    stock_quantity: number | null;
    price_adjustment: number | null;
  }>;
};

/** RawProduct with every nullable stock field collapsed to a number. */
type NormalizedProduct = Omit<
  InventoryProduct,
  "effective_stock" | "stock_is_derived"
>;

interface ComponentLink {
  parent_product_id: string;
  component_product_id: string;
}

/**
 * Build the kit stock lookup: for each kit, the MINIMUM stock across its
 * REQUIRED components, where a component's own stock is the sum of its variant
 * stocks. Optional components are excluded — a kit is still buildable without
 * the accessory. Mirrors the storefront's kit aggregation in
 * `modules/products/server/queries.ts`.
 */
async function buildKitStockMap(
  supabase: ReturnType<typeof getAdminClient>,
  kitIds: string[],
): Promise<Map<string, number>> {
  const kitStockById = new Map<string, number>();
  if (kitIds.length === 0) return kitStockById;

  const { data: links } = await supabase
    .from("product_components")
    .select("parent_product_id, component_product_id, is_required")
    .in("parent_product_id", kitIds)
    .eq("is_required", true);

  const requiredLinks = (links ?? []) as unknown as ComponentLink[];
  if (requiredLinks.length === 0) return kitStockById;

  const childIds = [
    ...new Set(
      requiredLinks
        .map((l) => l.component_product_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  const { data: childRows } = await supabase
    .from("products")
    .select("id, product_variants(stock_quantity)")
    .in("id", childIds);

  const componentStock = new Map<string, number>();
  for (const row of (childRows ?? []) as unknown as Array<{
    id: string;
    product_variants: Array<{ stock_quantity: number | null }> | null;
  }>) {
    const stock = (row.product_variants ?? []).reduce(
      (sum, v) => sum + Number(v.stock_quantity ?? 0),
      0,
    );
    componentStock.set(row.id, stock);
  }

  const childrenByParent = new Map<string, string[]>();
  for (const link of requiredLinks) {
    if (!link.component_product_id || !link.parent_product_id) continue;
    const list = childrenByParent.get(link.parent_product_id) ?? [];
    list.push(link.component_product_id);
    childrenByParent.set(link.parent_product_id, list);
  }

  for (const [parentId, ids] of childrenByParent) {
    const stocks = ids.map((id) => componentStock.get(id) ?? 0);
    // A kit with no resolvable children is treated as unbuildable (0), the
    // same as the storefront — never silently "in stock".
    kitStockById.set(parentId, stocks.length > 0 ? Math.min(...stocks) : 0);
  }

  return kitStockById;
}

export default async function InventoryPage(props: {
  searchParams: Promise<{ q?: string; stock?: string; page?: string }>;
}) {
  const { q, stock, page } = await props.searchParams;
  const currentPage = Math.max(1, parseInt(page ?? "1", 10));
  const PAGE_SIZE = 30;

  const supabase = getAdminClient();

  // The whole table is loaded (not a DB range) because stock for kits and
  // variant-bearing products is DERIVED — it cannot be filtered or sorted in
  // SQL without a view. The catalogue is small enough for this to stay cheap.
  let query = supabase
    .from("products")
    .select(
      `
        id, name, slug, thumbnail, product_type, stock_quantity, base_price, is_active,
        categories(id, name),
        product_variants(id, variant_name, stock_quantity, price_adjustment)
      `,
    )
    .order("name", { ascending: true });

  if (q) {
    query = query.ilike("name", `%${q}%`);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Inventory fetch error:", error);
  }

  const allProducts: NormalizedProduct[] = (
    (data ?? []) as unknown as RawProduct[]
  ).map((p) => ({
    ...p,
    stock_quantity: Number(p.stock_quantity ?? 0),
    product_variants: (p.product_variants ?? []).map((v) => ({
      ...v,
      stock_quantity: Number(v.stock_quantity ?? 0),
    })),
  }));

  const kitStockById = await buildKitStockMap(
    supabase,
    allProducts
      .filter((p) => (p.product_type ?? "standard") === "kit")
      .map((p) => p.id),
  );

  // Derive the number the storefront actually sells against.
  const enriched: InventoryProduct[] = allProducts.map((p) => {
    const effectiveStock = resolveEffectiveStock({
      productType: p.product_type,
      productId: p.id,
      productStock: p.stock_quantity,
      variants: p.product_variants ?? [],
      kitStockById,
    });

    // `products.stock_quantity` is only authoritative for a product that has
    // no variants and is not a kit. Everything else is managed on its variant
    // rows, so writing the product row would be a no-op that reads as success.
    const managedByVariants =
      (p.product_type ?? "standard") === "kit" ||
      (p.product_variants?.length ?? 0) > 0;

    return {
      ...p,
      effective_stock: effectiveStock,
      stock_is_derived: managedByVariants,
    };
  });

  const filtered = enriched.filter((p) => {
    if (stock === "out") return p.effective_stock === 0;
    if (stock === "low")
      return p.effective_stock > 0 && p.effective_stock < 10;
    if (stock === "available") return p.effective_stock > 0;
    return true;
  });

  // Lowest stock first — the reason an inventory screen exists.
  const sorted = [...filtered].sort((a, b) => {
    if (a.effective_stock !== b.effective_stock)
      return a.effective_stock - b.effective_stock;
    return a.name.localeCompare(b.name);
  });

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const from = (safePage - 1) * PAGE_SIZE;
  const productList = sorted.slice(from, from + PAGE_SIZE);

  // Fetch pending inbound batches from warehouse_sync_operations
  const { data: inboundRows } = await (supabase.from as any)(
    "warehouse_sync_operations"
  )
    .select("operation_id, request_payload, created_at, actor_id")
    .is("completed_at", null)
    .order("created_at", { ascending: false })
    .limit(10);

  const pendingInboundBatches: InboundBatch[] = (inboundRows ?? [])
    .filter((op: any) => op.request_payload?.type === "inbound_batch")
    .map((op: any) => ({
      operation_id: op.operation_id,
      filename: op.request_payload?.filename ?? "inbound.csv",
      note: op.request_payload?.note ?? null,
      item_count:
        op.request_payload?.item_count ??
        (op.request_payload?.items?.length || 0),
      total_quantity: op.request_payload?.total_quantity ?? 0,
      created_at: op.created_at,
      created_by: op.request_payload?.created_by_email ?? "warehouse",
      items: op.request_payload?.items ?? [],
    }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-3xl font-bold text-slate-900">
          Inventory
          <span className="ml-3 text-base font-normal text-slate-500">
            ({sorted.length} products)
          </span>
        </p>
      </div>

      <InventoryClient
        products={productList}
        count={sorted.length}
        currentPage={safePage}
        totalPages={totalPages}
        q={q ?? ""}
        stock={stock ?? "all"}
        pendingInboundBatches={pendingInboundBatches}
      />
    </div>
  );
}