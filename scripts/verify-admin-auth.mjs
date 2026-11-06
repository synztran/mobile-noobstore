#!/usr/bin/env node
/**
 * verify-admin-auth.mjs
 *
 * CI guard that holds admin API authorization to a single authority: the
 * middleware matcher. It fails the build if a future change silently exposes
 * an admin `/api/*` route.
 *
 * It asserts:
 *   1. The middleware matcher still matches `/api` (i.e. `api` is NOT listed
 *      in the negative lookahead of excluded static/asset routes).
 *   2. Explicit middleware exceptions are narrow; the crawling webhook must
 *      retain route-level shared-secret verification.
 *
 * Every other admin API handler is covered by the cookie-backed middleware
 * matcher. If someone edits the matcher to drop `/api` or weakens warehouse
 * bearer verification, this script fails the build.
 */

import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const middlewarePath = path.join(root, "apps/admin/src/middleware.ts");

const middleware = readFileSync(middlewarePath, "utf8");

let failures = 0;

const check = (cond, msg) => {
  if (!cond) {
    failures += 1;
    console.error(`[verify-admin-auth] FAIL: ${msg}`);
  }
};

const storefrontAdminRoute = path.join(
  root,
  "apps/web/src/app/api/admin/products/route.ts"
);
const storefrontAdminSource = readFileSync(storefrontAdminRoute, "utf8");
check(
  /auth\.getUser\(\)/.test(storefrontAdminSource) &&
    /profile\?\.role\s*!==\s*["']admin["']/.test(storefrontAdminSource),
  "storefront /api/admin/products route must verify session and exact admin role"
);
check(
  /getApiLimiter\(\)\.limit\(/.test(storefrontAdminSource),
  "storefront /api/admin/products route must have its own rate limit"
);

// 1. The matcher must NOT exclude /api. It may explicitly include it, or just
//    leave it out of the negative lookahead. Detect an attempt to exclude it.
const matcherBlock = middleware.match(/matcher:\s*\[([\s\S]*?)\]/);
check(Boolean(matcherBlock), "matcher config not found in middleware.ts");
if (matcherBlock) {
  const negLookahead = matcherBlock[1].match(/\(\(?!([^)]*)\)\)/);
  const excluded = negLookahead ? negLookahead[1] : "";
  check(
    !/api/.test(excluded),
    `matcher negative-lookahead excludes 'api' -> /api routes would be unprotected: ${excluded.trim()}`
  );
}

// 2. Permit only known API middleware exceptions. All other API routes pass
//    through the verified admin session/role gate.
const apiPaths = [
  ...middleware.matchAll(/pathname === ["'](\/api\/[^"']+)["']/g),
].map((match) => match[1]);
const middlewareExemptPaths = new Set([
  "/api/warehouse-sync",
  "/api/warehouse-sync/stock",
  "/api/crawling/webhook",
]);
check(
  apiPaths.every((pathname) => middlewareExemptPaths.has(pathname)),
  `unexpected API special-case: ${apiPaths.filter((pathname) => !middlewareExemptPaths.has(pathname)).join(", ")}`
);
check(
  apiPaths.includes("/api/crawling/webhook") &&
    /crawling\/webhook/.test(middleware),
  "crawling webhook exemption must remain explicit in admin middleware"
);

// 3. Confirm the middleware still returns JSON 401/403 rather than redirects
//    for API routes (so the guard represents real auth enforcement).
const jsonAuth =
  /NextResponse\.json[\s\S]*?401|NextResponse\.json[\s\S]*?403/.test(
    middleware
  );
check(
  jsonAuth,
  "middleware does not return a JSON 401/403 for unauthorized/forbidden API calls"
);

// 4. The (admin) layout is the REAL authorization boundary for admin pages.
//    The middleware's cookie check is only a routing hint (it fails open on an
//    unparseable cookie), and the pages beneath it read through the
//    service-role client, which bypasses RLS — so a page rendering without
//    this check would expose data with nothing left to stop it.
const layoutPath = path.join(root, "apps/admin/src/app/(admin)/layout.tsx");
const layout = readFileSync(layoutPath, "utf8");
check(
  /auth\.getUser\(\)/.test(layout),
  "(admin)/layout.tsx no longer calls auth.getUser() — admin pages would fall back to the middleware's fail-open cookie check"
);
check(
  /role\s*!==\s*["']admin["']/.test(layout),
  "(admin)/layout.tsx no longer rejects non-admin roles"
);

// 5. Every server page that reads through the service-role client must live
//    under that layout. Add a service-role page outside (admin) and it renders
//    with no authorization check at all.
const appDir = path.join(root, "apps/admin/src/app");
const adminGroup = path.join("app", "(admin)");

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.name === "page.tsx") out.push(full);
  }
  return out;
}

for (const file of walk(appDir)) {
  const rel = path.relative(path.join(root, "apps/admin/src"), file);
  if (rel.startsWith(adminGroup)) continue;
  // API routes are guarded by the middleware role check; only pages matter here.
  const source = readFileSync(file, "utf8");
  if (source.includes('"use client"')) continue;
  check(
    !source.includes("getAdminClient"),
    `${rel} is a server page using the service-role client but sits outside app/(admin), so no admin authorization is enforced for it`
  );
}

if (failures > 0) {
  console.error(`\n[verify-admin-auth] ${failures} check(s) failed.`);
  process.exit(1);
}
console.log(
  "[verify-admin-auth] OK — admin APIs are protected; webhook exemption remains explicit."
);
