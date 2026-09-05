import type { CartItem } from "@/modules/cart/types";

const GA_ID = process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID;

const CLIENT_ID_STORAGE_KEY = "ga4_client_id";
const SESSION_ID_STORAGE_KEY = "ga4_session_id";

/**
 * Read a cookie by name (client-side only).
 */
function getCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

/**
 * GA4 client id. Reuses the id gtag.js stores in the `_ga` cookie
 * (GA1.1.<cid>.<timestamp>) so Measurement Protocol events attribute to the
 * same user as the enhanced-measurement events. Falls back to a persisted
 * random id when the cookie is unavailable.
 */
export function getClientId(): string {
  if (typeof window === "undefined") return "";

  const gaCookie = getCookie("_ga");
  const match = gaCookie?.match(/^GA1\.\d+\.(\d+)\.(\d+)$/);
  if (match) return `${match[1]}.${match[2]}`;

  const stored = window.localStorage.getItem(CLIENT_ID_STORAGE_KEY);
  if (stored) return stored;

  const id = `${Math.floor(100000000 + Math.random() * 899999999)}.${Date.now()}`;
  window.localStorage.setItem(CLIENT_ID_STORAGE_KEY, id);
  return id;
}

/**
 * Positive numeric session id, persisted per browser tab/session so SPA
 * navigations share it (used by GA4 realtime/session attribution).
 */
export function getSessionId(): number {
  if (typeof window === "undefined") return 0;

  const stored = window.sessionStorage.getItem(SESSION_ID_STORAGE_KEY);
  const numeric = stored ? Number(stored) : NaN;
  if (Number.isFinite(numeric) && numeric > 0) return numeric;

  const id = Math.floor(Date.now() / 1000);
  window.sessionStorage.setItem(SESSION_ID_STORAGE_KEY, String(id));
  return id;
}

/**
 * Send an event to GA4 via the server-side Measurement Protocol proxy.
 * Fire-and-forget — analytics must never block the UI.
 */
function sendEvent(name: string, params?: Record<string, unknown>) {
  if (!GA_ID) return;
  if (typeof window === "undefined") return;

  const body = JSON.stringify({
    client_id: getClientId(),
    session_id: getSessionId(),
    events: [{ name, params: params ?? {} }],
  });

  try {
    fetch("/api/analytics/collect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {
      // ignore analytics failures
    });
  } catch {
    // ignore analytics failures
  }
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

/** Generic GA4 event sender (no-op without a configured GA4 id). */
export function trackEvent(name: string, params?: Record<string, unknown>) {
  sendEvent(name, params);
}

export function trackViewItem(product: GAProduct) {
  sendEvent("view_item", {
    currency: "VND",
    value: product.price,
    items: [gaItem(product)],
  });
}

export function trackViewItemList(items: GAProduct[], list_name: string) {
  sendEvent("view_item_list", {
    items: items.map((item, index) => ({
      ...gaItem(item),
      index,
      item_list_name: list_name,
    })),
  });
}

export function trackAddToCart(product: GAProduct) {
  sendEvent("add_to_cart", {
    currency: "VND",
    value: product.price * (product.quantity ?? 1),
    items: [gaItem(product)],
  });
}

export function trackRemoveFromCart(product: GAProduct) {
  sendEvent("remove_from_cart", {
    currency: "VND",
    value: product.price * (product.quantity ?? 1),
    items: [gaItem(product)],
  });
}

export function trackBeginCheckout(items: GAProduct[], total: number) {
  sendEvent("begin_checkout", {
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
  sendEvent("purchase", {
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
  sendEvent("add_to_wishlist", {
    currency: "VND",
    value: product.price,
    items: [gaItem(product)],
  });
}

export function trackRemoveWishlist(product: GAProduct) {
  sendEvent("remove_from_wishlist", {
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
