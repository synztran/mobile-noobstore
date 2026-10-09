import type { ShopProduct } from "@/modules/products/types";

/**
 * Card pricing display for products whose price varies by variant.
 *
 * Quantity-tiered products (e.g. switch packs of 70 / 90 / 110) carry one
 * variant per pack, so the number a card can honestly advertise is the
 * cheapest tier — and it has to be labelled "giá chỉ từ", otherwise the
 * customer reads a 70-pack price as the price for every pack size.
 *
 * Three card surfaces used to each re-derive this (and each got it slightly
 * wrong, only qualifying the price when `base_price` was 0). One helper, one
 * rule.
 */

export interface CardPricingInput {
  base_price: number;
  min_price?: number;
  from_price?: number;
  discount_price?: number;
  product_type?: string;
  variants?: Array<{ effective_price?: number }>;
}

export interface CardPricing {
  /** Price to render. */
  amount: number;
  /** Render the "giá chỉ từ" qualifier. */
  showFrom: boolean;
  /** Render the struck-through base price above a discounted amount. */
  showDiscount: boolean;
  /** Nothing is priced yet — render the "giá đang cập nhật" placeholder. */
  unpriced: boolean;
}

export function resolveCardPricing({
  base_price,
  min_price,
  from_price,
  discount_price,
  product_type,
  variants,
}: CardPricingInput): CardPricing {
  // `Number.isFinite` matters: a variant list with no priced variant used to
  // yield min_price = Infinity upstream, and Infinity would render as
  // "∞ ₫" on the card.
  const positive = (v: unknown): v is number =>
    typeof v === "number" && Number.isFinite(v) && v > 0;

  // Only a kit's from_price is a computed entry price (base + cheapest required
  // component variants) and it is authoritative — it already accounts for
  // assembling the cheapest valid kit, so it wins over min_price. For every
  // other product the list loader collapses from_price onto min_price, so
  // keying off its presence would label every card in the shop grid.
  const kitFromPrice =
    product_type === "kit" && positive(from_price) ? from_price : null;

  const candidates = [from_price, min_price].filter(positive);
  const fromPrice =
    kitFromPrice ?? (candidates.length > 0 ? Math.min(...candidates) : 0);
  const amount = fromPrice > 0 ? fromPrice : base_price;

  // Distinct tier prices across the variant list is the tiered-product signal.
  const tierPrices = (variants ?? [])
    .map((v) => Number(v.effective_price) || 0)
    .filter((p) => p > 0);
  const hasTiers = tierPrices.length > 0 && new Set(tierPrices).size > 1;

  return {
    amount,
    showFrom:
      hasTiers ||
      kitFromPrice !== null ||
      (base_price === 0 && fromPrice > 0) ||
      (fromPrice > 0 && fromPrice < base_price),
    showDiscount: Boolean(discount_price && discount_price > 0),
    unpriced: amount <= 0,
  };
}

/** Convenience wrapper for the `ShopProduct` shape the cards receive. */
export function cardPricingFor(product: ShopProduct): CardPricing {
  return resolveCardPricing(product);
}
