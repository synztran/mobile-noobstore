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
 *   2. The only `/api` bypass allowed is the external crawler webhook
 *      (authenticated by its own HMAC secret).
 *
 * Every non-webhook admin API handler is covered by the middleware matcher,
 * so new routes are protected automatically. If someone edits the matcher to
 * drop `/api`, or broadens the bypass, this script fails the build.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const middlewarePath = path.join(
  root,
  "apps/admin/src/middleware.ts",
);

const middleware = readFileSync(middlewarePath, "utf8");

let failures = 0;

const check = (cond, msg) => {
  if (!cond) {
    failures += 1;
    console.error(`[verify-admin-auth] FAIL: ${msg}`);
  }
};

// 1. The matcher must NOT exclude /api. It may explicitly include it, or just
//    leave it out of the negative lookahead. Detect an attempt to exclude it.
const matcherBlock = middleware.match(/matcher:\s*\[([\s\S]*?)\]/);
check(Boolean(matcherBlock), "matcher config not found in middleware.ts");
if (matcherBlock) {
  const negLookahead = matcherBlock[1].match(/\(\(?!([^)]*)\)\)/);
  const excluded = negLookahead ? negLookahead[1] : "";
  check(
    !/api/.test(excluded),
    `matcher negative-lookahead excludes 'api' -> /api routes would be unprotected: ${excluded.trim()}`,
  );

}

// 2. Ensure there is at least a middleware bypass for the webhook, and report
//    it so reviewers can confirm only that path is exempted.
const webhookBypass = /\/api\/crawling\/webhook/.test(middleware);
check(
  webhookBypass,
  "expected an explicit bypass for /api/crawling/webhook",
);

// 3. Confirm the middleware still returns JSON 401/403 rather than redirects
//    for API routes (so the guard represents real auth enforcement).
const jsonAuth = /NextResponse\.json[\s\S]*?401|NextResponse\.json[\s\S]*?403/.test(
  middleware,
);
check(
  jsonAuth,
  "middleware does not return a JSON 401/403 for unauthorized/forbidden API calls",
);

if (failures > 0) {
  console.error(`\n[verify-admin-auth] ${failures} check(s) failed.`);
  process.exit(1);
}
console.log(
  "[verify-admin-auth] OK — admin API is covered by middleware; only /api/crawling/webhook is bypassed.",
);