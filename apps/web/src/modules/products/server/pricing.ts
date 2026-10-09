/**
 * List/detail pricing for a product, derived from its variants.
 *
 * `effective_price = base_price + price_adjustment`, so a quantity-tiered
 * product (e.g. switch packs of 70 / 90 / 110) is modelled as one variant per
 * pack — the tiers are just variants with different adjustments. This module
 * turns that variant list into the three numbers the storefront reads:
 *
 * - `min_price`    cheapest single variant across the product and, for kits,
 *                  its child component variants
 * - `from_price`   what a kit starts from = base + cheapest variant of each
 *                  REQUIRED component; for everything else it collapses to
 *                  `min_price`
 * - `discount_*`   set only when a variant is genuinely cheaper than base
 *
 * It is deliberately pure and framework-free so `/api/products`, `/shop` and the
 * product detail loader cannot drift apart (same contract as
 * `resolveEffectiveStock`).
 */

export interface PricingVariant {
  effective_price: number;
}

export interface PricingInput {
  basePrice: number;
  variants: readonly PricingVariant[];
  /** Only set for kits: base + cheapest REQUIRED component variant. */
  kitFromPrice?: number;
}

export interface PricingResult {
  min_price: number;
  from_price: number;
  discount_price: number;
  discount_percentage: number;
  /** True when variants exist but none carries a price — worth logging. */
  unpriced: boolean;
}

export function resolveProductPricing({
  basePrice,
  variants,
  kitFromPrice,
}: PricingInput): PricingResult {
  // Priced variants only: a 0 here means "not configured yet", and letting it
  // win the min would advertise a free product. When *every* variant is
  // unpriced the candidate list is empty, so Math.min() would yield Infinity —
  // fall back to base_price instead of shipping Infinity to the client.
  const priced = variants
    .map((v) => Number(v.effective_price) || 0)
    .filter((p) => p > 0);

  const unpriced = variants.length > 0 && priced.length === 0;

  const minPrice = priced.length > 0 ? Math.min(...priced) : basePrice;

  const computedKitFromPrice =
    kitFromPrice !== undefined && kitFromPrice > 0 ? kitFromPrice : undefined;

  const fromPrice =
    computedKitFromPrice !== undefined
      ? computedKitFromPrice
      : minPrice > 0
        ? minPrice
        : basePrice;

  const hasDiscount = minPrice > 0 && basePrice > 0 && minPrice < basePrice;

  return {
    min_price: minPrice,
    from_price: fromPrice,
    discount_price: hasDiscount ? minPrice : 0,
    discount_percentage: hasDiscount
      ? Math.round(((basePrice - minPrice) / basePrice) * 100)
      : 0,
    unpriced,
  };
}
