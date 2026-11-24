# Auction Product Details Admin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let admins configure auction-specific product specifications, condition details and accessories, then render that saved content on storefront.

**Architecture:** Store optional typed JSONB metadata on `auction_products`; extend admin create/edit APIs and form; pass through auction queries and render only configured sections on storefront. Existing auctions with null metadata remain valid and hide those sections.

**Tech Stack:** Next.js App Router, React, TypeScript, Supabase PostgreSQL, Tailwind, Vitest.

**Spec:** User-approved direction in conversation: per-auction admin configuration for product details, actual condition and included accessories; persist in DB; storefront renders saved values and hides unconfigured sections.

## Global Constraints

- Keep existing auction bids, pricing and lifecycle logic unchanged.
- Preserve backward compatibility for auctions without metadata.
- Keep font-family choices within existing project fonts.
- Database function failures must use stable `error_code`; this plan adds no SQL functions.
- Do not add or upgrade packages.
- Admin API must remain middleware-protected.

## Review Focus

- Missing metadata on legacy auctions: detail sections hidden, no fabricated claims.
- Empty/whitespace admin fields: normalized or omitted, not displayed as blank rows.
- Malformed JSON / unexpected payload types: API rejects with safe 400 response.
- Admin edit saving partial metadata: unspecified auction fields remain unchanged.
- Long specs/accessory text on mobile: wraps without overflow.

---

### Task 1: Persist auction detail metadata

**Files:**
- Create: `supabase/migrations/172_auction_product_details.sql`
- Modify: `apps/web/src/modules/auction/types.ts`
- Modify: `apps/web/src/modules/auction/server/queries.ts`
- Test: auction query/type tests under `apps/web/src/modules/auction/**`

**Interfaces:**
- Add optional `product_details` to auction contract with `specs: { label: string; value: string }[]`, `condition: { grade: string; summary: string[]; attributes: { label: string; value: string }[] }`, and `accessories: string[]`.
- Database column `auction_products.product_details JSONB NULL`.

- [ ] Add migration and verify nullable JSONB column on fresh migration path.
- [ ] Define the shared contract and query selects/row shaping.
- [ ] Add test for null legacy metadata and populated detail metadata.
- [ ] Run focused tests and `yarn --cwd apps/web tsc --noEmit`.

### Task 2: Admin create and edit configuration

**Files:**
- Modify: `apps/admin/src/components/auctions/AuctionFormModal.tsx`
- Modify: `apps/admin/src/components/auctions/AuctionTable.tsx`
- Modify: `apps/admin/src/app/(admin)/auctions/page.tsx`
- Modify: `apps/admin/src/app/api/auctions/route.ts`
- Modify: `apps/admin/src/app/api/auctions/[id]/route.ts`
- Test: admin auction API tests if existing; otherwise add focused validation tests alongside current API test conventions.

**Interfaces:**
- Create API accepts optional `product_details`.
- Update API accepts optional `product_details`; omission preserves current value.
- Admin UI uses add/remove rows for specs, condition summary/attributes, and accessories; edit initializes from fetched auction.

- [ ] Add bounded validation/normalization for nested metadata, required labels and values, list sizes, and text length.
- [ ] Add API handling for create/update; reject malformed metadata with 400.
- [ ] Add edit action and reuse form for create/edit without changing unrelated auction fields.
- [ ] Add admin checks for valid nested data, empty values, and partial updates.
- [ ] Run admin type-check and `yarn check:admin-auth`.

### Task 3: Render configured content on storefront

**Files:**
- Modify: `apps/web/src/modules/auction/ui/AuctionDetailClient.tsx`
- Test: storefront auction detail rendering tests.

**Interfaces:**
- Consume `auction.product_details` from shared auction detail response.
- Render only configured specs, condition summary/attributes, and accessories; remove hardcoded keyboard/Grade S/accessory copy.

- [ ] Replace hardcoded specification, condition, and accessory values with saved metadata.
- [ ] Hide each subsection when its data is absent; retain outer layout and mockup colors/spacing.
- [ ] Test null, partial, and fully configured metadata rendering.
- [ ] Check long values at mobile viewport and run web type-check/unit tests.

### Task 4: Integration verification and security scan

**Files:**
- Scan all modified first-party files from Tasks 1–3.

- [ ] Run `yarn --cwd apps/web tsc --noEmit`, `yarn test:unit`, admin type-check, and `yarn check:admin-auth`.
- [ ] Apply migration locally if Supabase tooling is available; verify persisted create/update/read flow.
- [ ] Run Aikido scan on modified source and migration paths; fix findings and rescan.
- [ ] Verify admin edit and storefront detail in browser; report any database setup blocker.
