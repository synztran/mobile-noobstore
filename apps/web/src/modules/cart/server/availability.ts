import "server-only";

import type { Database } from "@/lib/supabase/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

type Supabase = SupabaseClient<Database>;

/**
 * Stock-availability core for cart lines (deep module).
 *
 * The rules here are pure over plain data — no I/O. cart-service.ts loads an
 * AvailabilitySnapshot through loadAvailabilitySnapshot (the adapter at an
 * internal seam) and feeds it to assertQuantityAvailable, the single entry
 * point. Client-side pre-checks and checkout could share the same rule shape
 * without importing any Supabase code.
 *
 * Shapes covered:
 *  - standard base      : products.stock_quantity (only when the line has no variant)
 *  - standard variant   : product_variants.stock_quantity owns the pool —
 *                         products.stock_quantity is not a gate (a blank /
 *                         NULL product box must not block a stocked variant)
 *  - kit                : each selected component variant's stock, where one kit
 *                          unit consumes one unit of every selected variant, and
 *                          `committed` carries what OTHER lines already hold
 *  - per-order max      : products.max_quantity for all shapes
 */

export interface ProductAvailability {
  productType: string;
  /** NULL when the product row has no stock of its own (blank box / kit). */
  stock: number | null;
  max: number | null;
}

export interface LineAvailability {
  variantId: string | null;
  /** Selected kit component variant ids (one unit of each per kit). */
  childVariantIds: string[];
  /** The line's current quantity, used only to detect decreases. */
  currentQty: number;
}

export interface AvailabilitySnapshot {
  product: ProductAvailability;
  line: LineAvailability;
  /** id -> stock for every variant the line touches (children or own variant). */
  variantStock: Record<string, number>;
  /** id -> units already committed by OTHER lines in the cart (excludes this line). */
  committed: Record<string, number>;
}

export type AvailabilityResult =
  | { ok: true }
  | { ok: false; kind: "stock"; resource: string; available: number }
  | { ok: false; kind: "max"; max: number }
  | { ok: false; kind: "not_configured" };

/**
 * Is `targetQty` for the snapshot's line allowed?
 *
 * Invariants:
 *  - Decreasing a line is always allowed (it frees capacity).
 *  - max_quantity applies to every shape on increase.
 *  - Kit inventory lives on component variants, never products.stock_quantity
 *    (admin stores NULL for kits), so kits are checked per selected variant
 *    against committed usage + target × occurrences of that variant.
 */
export function assertQuantityAvailable(
  snapshot: AvailabilitySnapshot,
  targetQty: number
): AvailabilityResult {
  const { product, line, variantStock, committed } = snapshot;

  if (targetQty < line.currentQty) return { ok: true };

  if (product.max != null && targetQty > product.max) {
    return { ok: false, kind: "max", max: product.max };
  }

  if (product.productType === "kit") {
    if (line.childVariantIds.length > 0) {
      const uniqueVariants = new Set(line.childVariantIds);
      for (const vid of uniqueVariants) {
        const multiplicity = line.childVariantIds.filter(
          (v) => v === vid
        ).length;
        const needed = (committed[vid] ?? 0) + targetQty * multiplicity;
        const stock = variantStock[vid] ?? 0;
        if (needed > stock) {
          return {
            ok: false,
            kind: "stock",
            resource: vid,
            available: stock,
          };
        }
      }
      return { ok: true };
    }

    if (line.variantId) {
      // Kit component row addressed directly — its own variant is the ceiling.
      const stock = variantStock[line.variantId] ?? 0;
      if (targetQty > stock) {
        return {
          ok: false,
          kind: "stock",
          resource: line.variantId,
          available: stock,
        };
      }
      return { ok: true };
    }

    // Kit parent whose component rows are missing — nothing to validate
    // against, and kit product rows carry no own stock. Block growth.
    return { ok: false, kind: "not_configured" };
  }

  // Standard products: a selected variant row owns the pool — the product row
  // only gates lines with no variant (products.stock_quantity may be NULL,
  // meaning "managed on variants", and must not block them).
  if (line.variantId) {
    const stock = variantStock[line.variantId] ?? 0;
    if (targetQty > stock) {
      return {
        ok: false,
        kind: "stock",
        resource: line.variantId,
        available: stock,
      };
    }
    return { ok: true };
  }
  const productStock = product.stock ?? 0;
  if (targetQty > productStock) {
    return {
      ok: false,
      kind: "stock",
      resource: "product",
      available: productStock,
    };
  }
  return { ok: true };
}

// ─── Adapter: load the snapshot from Supabase (internal seam) ────────────────

export interface LoadAvailabilityParams {
  cartId: string;
  productId: string;
  variantId?: string | null;
  /** Selected kit component variant ids (may repeat when a kit uses a variant in two groups). */
  childVariantIds?: string[];
  /** Line to exclude from `committed` — the line being added to / changed. */
  excludeLineId?: string | null;
  /** Current quantity of that line when the caller already knows it. */
  currentQty?: number;
}

export async function loadAvailabilitySnapshot(
  supabase: Supabase,
  params: LoadAvailabilityParams
): Promise<AvailabilitySnapshot> {
  const {
    cartId,
    productId,
    variantId = null,
    childVariantIds = [],
    excludeLineId = null,
  } = params;

  const [product, variantStock, committed, currentQty] = await Promise.all([
    fetchProductAvailability(supabase, productId),
    fetchVariantStock(
      supabase,
      Array.from(
        new Set(
          [variantId, ...childVariantIds].filter((v): v is string => Boolean(v))
        )
      )
    ),
    computeCommittedUsage(supabase, cartId, excludeLineId),
    params.currentQty != null
      ? Promise.resolve(params.currentQty)
      : fetchLineQuantity(supabase, excludeLineId),
  ]);

  return {
    product,
    line: { variantId, childVariantIds, currentQty },
    variantStock,
    committed,
  };
}

async function fetchProductAvailability(
  supabase: Supabase,
  productId: string
): Promise<ProductAvailability> {
  const { data } = await supabase
    .from("products")
    .select("stock_quantity, max_quantity, product_type")
    .eq("id", productId)
    .single();

  return {
    stock: data?.stock_quantity != null ? Number(data.stock_quantity) : null,
    max: data?.max_quantity != null ? Number(data.max_quantity) : null,
    productType: data?.product_type ?? "standard",
  };
}

async function fetchVariantStock(
  supabase: Supabase,
  variantIds: string[]
): Promise<Record<string, number>> {
  if (variantIds.length === 0) return {};
  const { data } = await supabase
    .from("product_variants")
    .select("id, stock_quantity")
    .in("id", variantIds);
  const map: Record<string, number> = {};
  for (const v of data ?? []) {
    map[v.id] = Number(v.stock_quantity ?? 0);
  }
  return map;
}

/**
 * Units of each variant committed by kit parent lines in the cart, excluding
 * `excludeLineId` (the line being changed). Kit parent lines' quantity is the
 * multiplier; child rows (one per selected variant occurrence) are qty-1 marks.
 */
async function computeCommittedUsage(
  supabase: Supabase,
  cartId: string,
  excludeLineId: string | null
): Promise<Record<string, number>> {
  const usage: Record<string, number> = {};

  const { data: parents } = await supabase
    .from("cart_items")
    .select("id, quantity")
    .eq("cart_id", cartId)
    .is("parent_cart_item_id", null);

  const parentQtyById = new Map(
    (parents ?? []).map((p) => [p.id, p.quantity ?? 1])
  );
  const parentIds = (parents ?? [])
    .map((p) => p.id)
    .filter((id) => id !== excludeLineId);

  if (parentIds.length === 0) return usage;

  const { data: children } = await supabase
    .from("cart_items")
    .select("parent_cart_item_id, variant_id")
    .in("parent_cart_item_id", parentIds)
    .not("variant_id", "is", null);

  for (const child of children ?? []) {
    if (!child.variant_id || !child.parent_cart_item_id) continue;
    usage[child.variant_id] =
      (usage[child.variant_id] ?? 0) +
      (parentQtyById.get(child.parent_cart_item_id) ?? 1);
  }

  return usage;
}

async function fetchLineQuantity(
  supabase: Supabase,
  lineId: string | null
): Promise<number> {
  if (!lineId) return 0;
  const { data } = await supabase
    .from("cart_items")
    .select("quantity")
    .eq("id", lineId)
    .maybeSingle();
  return data?.quantity ?? 0;
}
