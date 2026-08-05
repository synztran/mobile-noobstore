import type { CartItem } from "@/lib/data";

const GA_ID = process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID;

declare global {
  interface Window {
    dataLayer: unknown[];
  }
}

function gtag(...args: unknown[]) {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(args);
}

export function trackPageView(url: string) {
  if (!GA_ID) return;
  gtag("event", "page_view", { page_path: url });
}

export interface GAProduct {
  id: string;
  name: string;
  price: number;
  brand?: string;
  category?: string;
  quantity?: number;
}

/** Convert a product (+ optional variant) into GA4 e-commerce item shape. */
export function toGAProduct(
  product: {
    id: string;
    name: string;
    category?: string | null;
    brand?: string | null;
    base_price?: number;
    price?: number;
    discount_price?: number;
    quantity?: number;
  },
  variant?: { effective_price?: number } | null
): GAProduct {
  return {
    id: product.id,
    name: product.name,
    price:
      variant?.effective_price ??
      product.price ??
      product.discount_price ??
      product.base_price ??
      0,
    brand: product.brand ?? undefined,
    category: product.category ?? undefined,
    quantity: product.quantity,
  };
}

/** Convert a CartItem into a GA4 product, accounting for variant + component pricing. */
export function cartItemToGA(item: CartItem): GAProduct {
  const componentsTotal = (item.components ?? []).reduce(
    (sum, c) => sum + c.price_adjustment,
    0
  );
  return {
    id: item.product.id,
    name: item.product.name,
    price: (item.variant?.effective_price ?? item.product.base_price) + componentsTotal,
    category: item.product.category,
    quantity: item.quantity,
  };
}

export function cartItemsToGA(items: CartItem[]): GAProduct[] {
  return items.map(cartItemToGA);
}

/** Serialize a GAProduct into the raw `items[]` entry GA4 expects. */
function gaItem(p: GAProduct) {
  return {
    item_id: p.id,
    item_name: p.name,
    price: p.price,
    quantity: p.quantity ?? 1,
    item_brand: p.brand,
    item_category: p.category,
  };
}

/** Generic gtag event push (no-op without a configured GA4 id). */
export function trackEvent(name: string, params?: Record<string, unknown>) {
  if (!GA_ID) return;
  gtag("event", name, params);
}

export function trackViewItem(product: GAProduct) {
  if (!GA_ID) return;
  gtag("event", "view_item", {
    currency: "VND",
    value: product.price,
    items: [gaItem(product)],
  });
}

export function trackViewItemList(items: GAProduct[], list_name: string) {
  if (!GA_ID) return;
  gtag("event", "view_item_list", {
    items: items.map((item, index) => ({
      ...gaItem(item),
      index,
      item_list_name: list_name,
    })),
  });
}

export function trackAddToCart(product: GAProduct) {
  if (!GA_ID) return;
  gtag("event", "add_to_cart", {
    currency: "VND",
    value: product.price * (product.quantity ?? 1),
    items: [gaItem(product)],
  });
}

export function trackRemoveFromCart(product: GAProduct) {
  if (!GA_ID) return;
  gtag("event", "remove_from_cart", {
    currency: "VND",
    value: product.price * (product.quantity ?? 1),
    items: [gaItem(product)],
  });
}

export function trackBeginCheckout(items: GAProduct[], total: number) {
  if (!GA_ID) return;
  gtag("event", "begin_checkout", {
    currency: "VND",
    value: total,
    items: items.map(gaItem),
  });
}

export function trackPurchase(
  transactionId: string,
  items: GAProduct[],
  total: number
) {
  if (!GA_ID) return;
  gtag("event", "purchase", {
    transaction_id: transactionId,
    currency: "VND",
    value: total,
    items: items.map(gaItem),
  });
}

// ─── Custom events ────────────────────────────────────────────────────────────

export function trackSearch(term: string, resultsCount?: number) {
  trackEvent("search", {
    search_term: term,
    ...(resultsCount != null ? { results_count: resultsCount } : {}),
  });
}

export function trackWishlist(product: GAProduct) {
  if (!GA_ID) return;
  gtag("event", "add_to_wishlist", {
    currency: "VND",
    value: product.price,
    items: [gaItem(product)],
  });
}

export function trackRemoveWishlist(product: GAProduct) {
  if (!GA_ID) return;
  gtag("event", "remove_from_wishlist", {
    currency: "VND",
    value: product.price,
    items: [gaItem(product)],
  });
}

export function trackGachaPlay(count: number) {
  trackEvent("gacha_play", { count });
}

export function trackGachaWin(reward: {
  type?: string;
  name?: string;
  value?: number | string | null;
}) {
  trackEvent("gacha_win", {
    reward_type: reward.type,
    reward_name: reward.name,
    reward_value: reward.value,
  });
}

export function trackNewsletterSubscribe() {
  trackEvent("newsletter_subscribe", {});
}

export function trackVoucherApply(codes: string[], discountAmount: number) {
  trackEvent("voucher_apply", {
    voucher_codes: codes.join(","),
    discount_amount: discountAmount,
  });
}
