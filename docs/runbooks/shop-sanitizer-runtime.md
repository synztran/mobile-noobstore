# Shop HTTP 500: sanitizer CommonJS/ESM compatibility

## Incident cause

Security hardening introduced `isomorphic-dompurify@^3.19.0` in shared
`lib/safe-html.ts`. That package resolved to a jsdom 29 dependency chain where
CommonJS `html-encoding-sniffer` requires ESM `@exodus/bytes/encoding-lite.js`.
Vercel's runtime loader rejected this with `ERR_REQUIRE_ESM`, aborting route
module loading and returning HTTP 500 for `/shop` and product detail pages.

The shop listing only needed `safeJsonLd`, but importing the shared file also
loaded the sanitizer. Product detail additionally needs rich-text sanitization.
Repeated requests/prefetches produced many logs for the same import failure.
This was not a database, rate-limit, stock, or shop UI bug.

Local Node allowed require(ESM), so normal unit tests and successful builds did
not establish compatibility with Vercel's loader. The missing deployment-runtime
smoke test allowed this regression to escape.

## Fix

- Pin `isomorphic-dompurify` to 2.26.0, which uses jsdom ^26.1.0 and DOMPurify
  ^3.2.6. Verified resolution during repair: jsdom 26.1.0, DOMPurify 3.4.17.
  Keep current patched DOMPurify via the lockfile; do not disable sanitization.
- Regenerate lockfile using Yarn 4.3.1, never manual dependency record edits.
- Put pure JSON-LD escaping in `lib/safe-json-ld.ts`; retain its re-export from
  `safe-html.ts` for compatibility. Existing shop callers are deliberately
  unchanged, so they still load the now-compatible sanitizer. The re-export
  alone is not dependency isolation for those callers.
- Add child-process test loading sanitizer with
  `--no-experimental-require-module`, alongside XSS regression tests.

No shop page/component/query/business-logic files or Vercel runtime settings
are changed by this fix. No migration is needed.

## Verification and deployment

1. Ship package manifest and matching Yarn-generated lockfile together. Exclude
   unrelated local workspace/dependency changes when staging this hotfix.
2. Run `corepack yarn install --immutable`, unit tests and web production build.
3. Deploy and check `/shop`, filtered shop, and `/shop/kkb-wob`; all must stop
   reporting `ERR_REQUIRE_ESM`. A build alone cannot prove runtime recovery.
4. Check rich text still renders and malicious scripts/event handlers are removed.

Temporary compatibility pin must be revisited when upstream packages and Vercel
loader interoperate. Do not blindly lift it during dependency updates. Consider
separate cold-start smoke tests in Vercel preview for future sanitizer upgrades.
