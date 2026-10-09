/**
 * Single source of truth for a product's stock.
 *
 * Two exports, and both are load-bearing — do not re-implement either:
 *
 *  - `resolveEffectiveStock` — one product's sellable stock, given its own
 *    variants and (for kits) the pre-resolved kit map.
 *  - `resolveKitStockById` — the kit map itself, for a batch of
 *    `product_components` links.
 *
 * Consumers: `ssr.ts` (`/shop`, `/shop/[slug]`) and `queries.ts`
 * (`/api/products`). All of them must agree — a divergence here shows up as
 * "the listing says sold out but the product page says in stock", which is the
 * exact failure this module exists to prevent.
 *
 * Rule (variant-authoritative — mirrors cart availability.ts and the
 * submit_order RPC in migration 143):
 *  - kit        : min across required component stocks (each child resolved the
 *                 same way, recursively); falls back to the kit's own variants,
 *                 then the product row.
 *  - component  : sum across its variants (0 when it has none).
 *  - standard   : a selected variant owns the pool — when variants exist,
 *                 their stock sums; the product row only counts for
 *                 variant-less lines (it may be NULL/unmanaged).
 */
type VariantLike = { stock_quantity: number };

export function resolveEffectiveStock(opts: {
  productType: string | null | undefined;
  productId: string;
  productStock: number | null | undefined;
  variants: VariantLike[];
  kitStockById: Map<string, number>;
}): number {
  const type = opts.productType ?? "standard";
  const productStock = Number(opts.productStock ?? 0);

  if (type === "kit") {
    const kitStock = opts.kitStockById.get(opts.productId);
    if (typeof kitStock === "number") return kitStock;
    if (opts.variants.length > 0) {
      return Math.min(
        ...opts.variants.map((v) => Number(v.stock_quantity ?? 0))
      );
    }
    return productStock;
  }

  if (type === "component") {
    return opts.variants.reduce(
      (sum, v) => sum + Number(v.stock_quantity ?? 0),
      0
    );
  }

  if (opts.variants.length > 0) {
    return opts.variants.reduce(
      (sum, v) => sum + Number(v.stock_quantity ?? 0),
      0
    );
  }

  return productStock;
}

/** One row of `product_components`, as far as stock is concerned. */
export interface ComponentLink {
  parent_product_id: string;
  component_product_id: string;
  is_required: boolean;
}

/**
 * A product, as far as kit stock resolution is concerned. `variantStocks` is
 * the already-parsed per-variant quantities (callers map them out of the
 * joined `product_variants` row).
 */
export interface StockNode {
  id: string;
  product_type: string | null | undefined;
  stock_quantity: number | null | undefined;
  variantStocks: number[];
}

/**
 * Kit stock for every kit in `links`: the MINIMUM stock across its REQUIRED
 * components, where each component's own stock is `resolveEffectiveStock`.
 *
 * This is the SINGLE source for kit child stock. Both surfaces must call it or
 * they drift — which is exactly what happened: `queries.ts` (used by /shop and
 * /api/products) summed a child's variant rows, while `ssr.ts` (used by
 * /shop/[slug]) ran the child through `resolveEffectiveStock` with an empty kit
 * map, so a kit child collapsed to `min(own variants)`. One product showed 3 on
 * the listing and 1 on its detail page.
 *
 * Three deliberate rules:
 *
 * 1. Required only — an optional component (accessories) does not gate whether
 *    a kit is buildable.
 * 2. Recursive — a child that is itself a kit resolves through ITS components,
 *    so nesting works instead of silently reading the wrapper's variants.
 * 3. Cycle-guarded — `product_components` should never point a product at
 *    itself or form a loop. When bad data does, the branch resolves to 0 rather
 *    than recursing forever or inventing a number, so the product shows "Sold
 *    out" on every surface until the data is fixed.
 */
export function resolveKitStockById(opts: {
  links: ComponentLink[];
  nodes: Map<string, StockNode>;
}): Map<string, number> {
  const { links, nodes } = opts;
  const result = new Map<string, number>();

  // Only required links feed stock. Optional ones are display-only.
  const requiredChildren = new Map<string, string[]>();
  for (const link of links) {
    if (!link?.is_required) continue;
    if (!link.parent_product_id || !link.component_product_id) continue;
    const list = requiredChildren.get(link.parent_product_id) ?? [];
    list.push(link.component_product_id);
    requiredChildren.set(link.parent_product_id, list);
  }

  // `resolving` is the current recursion stack — the cycle guard.
  const resolving = new Set<string>();

  const childStock = (childId: string): number => {
    // Self-reference or a loop in the data: unresolvable, so 0.
    if (resolving.has(childId)) return 0;

    const node = nodes.get(childId);
    // Both callers fetch component rows with `.eq("is_active", true)`, so a
    // child missing here is inactive or deleted — treat as no stock.
    if (!node) return 0;

    resolving.add(childId);
    try {
      if ((node.product_type ?? "standard") === "kit") {
        const grandchildren = requiredChildren.get(childId) ?? [];
        // A kit with no resolvable required children cannot be built.
        if (grandchildren.length === 0) return 0;
        const stocks = grandchildren.map((id) => childStock(id));
        return stocks.length > 0 ? Math.min(...stocks) : 0;
      }

      return resolveEffectiveStock({
        productType: node.product_type,
        productId: node.id,
        productStock: node.stock_quantity,
        variants: node.variantStocks.map((n) => ({ stock_quantity: n })),
        kitStockById: new Map(),
      });
    } finally {
      resolving.delete(childId);
    }
  };

  for (const [parentId, childIds] of requiredChildren) {
    const stocks = childIds.map((id) => childStock(id));
    result.set(parentId, stocks.length > 0 ? Math.min(...stocks) : 0);
  }

  return result;
}
