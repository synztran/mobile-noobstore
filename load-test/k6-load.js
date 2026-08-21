// k6 load test — NoobStore production API endpoints
//
// Endpoint → component mapping (traceability):
//   GET /api/products/sale?limit=5&sort=discount_desc   → SaleSection.tsx  (useHomeSaleProducts, useHomeQueries.ts:70)
//   GET /api/products/noteworthy?limit=5                → NoteworthySection.tsx (useHomeNoteworthy, useHomeQueries.ts:51)
//   GET /api/products?limit=12&offset=0&sort=newest      → /shop product list (useShopInfiniteQuery.ts:34)
//   GET /api/products/quick-pick?categorySlug=keyboards  → QuickPickDrawer.tsx (useQuickPickDrawer.ts:32)
//   GET /api/cart                                        → CartDrawer.tsx (useCartQueries.ts:62)
//
// Load: 50 VUs full-burst on the rate-limit-exempt product endpoints.
//       /api/cart is rate-limited at 100 req/min/IP (middleware.ts) → isolated
//       scenario capped at 30 shared iterations to stay under it.
//
// Run:  k6 run load-test/k6-load.js
//       (override target:  k6 run load-test/k6-load.js -e BASE_URL=https://staging.noobstore.xyz)

import http from "k6/http";
import { check } from "k6";
import { group } from "k6";

const BASE_URL = __ENV.BASE_URL || "https://www.noobstore.xyz";

export const options = {
  scenarios: {
    products: {
      executor: "constant-vus",
      vus: 100,
      duration: "1m",
    },
    cart: {
      executor: "shared-iterations",
      exec: "cart_scenario",
      vus: 30,
      iterations: 30,
      maxDuration: "1m",
    },
  },
  thresholds: {
    http_req_duration: ["p(95) < 500"],
    "http_req_duration{endpoint:sale}": ["p(95) < 500", "p(99) < 1000"],
    "http_req_duration{endpoint:noteworthy}": ["p(95) < 500", "p(99) < 1000"],
    "http_req_duration{endpoint:products}": ["p(95) < 500", "p(99) < 1000"],
    "http_req_duration{endpoint:quickpick}": ["p(95) < 500", "p(99) < 1000"],
    "http_req_failed{endpoint:cart}": ["rate < 0.05"],
  },
};

function getOk(url, tags, name) {
  const res = http.get(url, tags);
  const pass = res.status === 200;
  check(res, {
    [`${name} status is 200`]: () => pass,
  });
  return res;
}

export default function () {
  group("sale section", () => {
    getOk(
      `${BASE_URL}/api/products/sale?limit=5&sort=discount_desc`,
      { tags: { endpoint: "sale" } },
      "sale",
    );
  });

  group("noteworthy section", () => {
    getOk(
      `${BASE_URL}/api/products/noteworthy?limit=5`,
      { tags: { endpoint: "noteworthy" } },
      "noteworthy",
    );
  });

  group("shop product list", () => {
    getOk(
      `${BASE_URL}/api/products?limit=12&offset=0&sort=newest`,
      { tags: { endpoint: "products" } },
      "products",
    );
  });

  group("quick pick drawer", () => {
    getOk(
      `${BASE_URL}/api/products/quick-pick?categorySlug=keyboards`,
      { tags: { endpoint: "quickpick" } },
      "quickpick",
    );
  });
}

export function cart_scenario() {
  group("cart drawer", () => {
    getOk(`${BASE_URL}/api/cart`, { tags: { endpoint: "cart" } }, "cart");
  });
}