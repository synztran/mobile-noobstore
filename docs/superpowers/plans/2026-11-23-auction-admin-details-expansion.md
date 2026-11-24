# Auction Admin Details Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete admin auction editing and storefront details with auction pricing/eligibility controls, predefined condition grades, and dedicated inspection photos.

**Architecture:** Keep descriptive metadata in `auction_products.product_details` JSONB, extending it with condition image URLs. Extend existing auction APIs for editable auction fields with server-enforced safety rules; web continues reading the same auction row and renders dedicated condition images only.

**Tech Stack:** Next.js 15, React, TypeScript, Supabase Postgres/Storage, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-23-auction-admin-details-expansion-design.md`

## Global Constraints

- No new package.
- Existing create behavior and legacy auction data remain valid.
- Starting price and increment settings are editable only when the auction has zero bids and is not active.
- Do not alter `current_price` as part of an edit.
- Removing an inspection image removes it from auction metadata but does not delete Storage objects.
- Inspection photos must never be sourced from product or variant images.

## Review Focus

- Concurrent bid lands after edit eligibility check: API must not permit unsafe price changes; test or use a transaction/RPC if current read-then-write cannot guarantee this.
- Malformed, non-HTTP(S), oversized-count, or overlong image URLs: parser rejects them.
- Legacy rows without `condition.images`: parse and render without errors or inherited product images.
- Upload failure during multi-image selection: keep already uploaded/current metadata and show recoverable error.
- BIN below/equal to starting price or invalid eligibility numeric values: API rejects before update.

---

### Task 1: Extend auction details contract and parsers

**Files:**
- Modify: `apps/admin/src/lib/auction-product-details.ts`
- Modify: `apps/admin/src/lib/auction-product-details.test.ts`
- Modify: `apps/admin/src/types/auction.ts`
- Modify: `apps/web/src/modules/auction/product-details.ts`
- Modify: `apps/web/src/modules/auction/product-details.test.ts` (locate existing parser test)

**Interfaces:**
- Produces `AuctionProductDetails.condition.images: string[]`, optional in parsed legacy input and normalized to `[]`.
- Grade keys are `"S" | "A" | "B" | "C" | "D"` in admin form state and persisted as those strings.

- [ ] **Step 1: Add failing parser tests** for accepted S–D grades, rejected unknown grades, HTTP/HTTPS image URLs, rejection of non-HTTP URLs, and legacy metadata without `condition.images` normalizing to an empty array.
- [ ] **Step 2: Run focused parser tests** with the existing workspace test command; verify new cases fail first.
- [ ] **Step 3: Extend admin and web parsers/types** to enforce the spec’s existing 20-item/500-character limits and URL protocol restrictions while preserving legacy input.
- [ ] **Step 4: Run focused parser tests** and confirm all pass.

### Task 2: Admin API updates for safe auction edits

**Files:**
- Modify: `apps/admin/src/app/api/auctions/[id]/route.ts`
- Modify: `apps/admin/src/app/api/auctions/route.ts` only if create grade validation needs shared parser use
- Add/modify tests adjacent to auction API routes using repository’s existing admin API test conventions.

**Interfaces:**
- `PUT /api/auctions/[id]` accepts `starting_price`, `increment_type`, `increment_value`, `bin_price`, eligibility fields, and `product_details`.
- Existing `GET` response already includes bid count through route’s bid relation; add `total_bids` if needed for edit UI.

- [ ] **Step 1: Add failing route tests** for allowed edits to BIN/eligibility, valid no-bid draft starting-price/increment edits, active or bid-bearing price/increment edits rejected, and BIN/eligibility validation.
- [ ] **Step 2: Run focused API tests** and confirm failures.
- [ ] **Step 3: Implement validated updates**; check bid count and status on the server before changing starting price/increment, never update `current_price`, and return a stable error code/message for forbidden edits. If race safety cannot be guaranteed by current query pattern, implement a database transaction/RPC and migration rather than relying on read-then-write.
- [ ] **Step 4: Run focused route tests** and confirm pass.

### Task 3: Admin form for pricing, eligibility, grades, and inspection uploads

**Files:**
- Modify: `apps/admin/src/components/auctions/AuctionFormModal.tsx`

**Interfaces:**
- Consumes Task 1’s validated details shape and Task 2’s edit contract.
- Uses existing `POST /api/upload`; append an auction-specific `slug`/path value, without changing shared upload API behavior.

- [ ] **Step 1: Add focused form tests** for grade selector options S/A/B/C/D with storefront rubric descriptions, edit-lock visibility for active/bid-bearing auctions, and inspection photo add/remove plus failed-upload retention.
- [ ] **Step 2: Implement data loading** for bid count/status and existing pricing/eligibility/photo metadata; expose starting price and increment controls only when allowed, while BIN and eligibility remain editable.
- [ ] **Step 3: Replace free-text Grade field with S–D selection** and show each grade’s existing storefront rubric text in the options/help text.
- [ ] **Step 4: Add multi-image inspection upload** through `/api/upload`, preview thumbnails, remove-from-metadata control, loading/error states, and no Storage deletion.
- [ ] **Step 5: Expand live storefront preview** to show starting price, increment, optional BIN, eligibility requirements, grade/condition content, dedicated inspection images, and accessories; keep empty optional sections hidden.
- [ ] **Step 6: Submit permitted auction fields and details** through the existing create/edit endpoints, preserving existing create flow and edit restrictions.
- [ ] **Step 7: Run admin form tests/type-check**; record unrelated baseline errors separately.

### Task 4: Storefront inspection images and preview parity

**Files:**
- Modify: `apps/web/src/modules/auction/types.ts`
- Modify: `apps/web/src/modules/auction/server/queries.ts` only if product details are not already selected and returned
- Modify: `apps/web/src/modules/auction/ui/AuctionDetailClient.tsx`
- Modify: web auction UI tests/fixtures covering product inspection sections.

**Interfaces:**
- Consumes Task 1’s `condition.images` contract.
- Inspection gallery source is exclusively `details.condition.images`; product/variant `images` remain for the main product gallery only.

- [ ] **Step 1: Add failing UI/render tests** verifying inspection gallery uses auction condition images, does not fall back to product images, and is absent for legacy/empty metadata.
- [ ] **Step 2: Render dedicated URLs** in the condition inspection grid, retaining existing captions/interaction where accurate and removing captions that claim provenance not represented by data.
- [ ] **Step 3: Run focused web tests and web type-check**; confirm legacy fixtures remain valid.

### Task 5: Integrated verification

**Files:**
- No additional source files unless verification identifies a defect.

- [ ] Run web unit tests and type-check.
- [ ] Run admin parser/API/form tests and admin type-check; document known unrelated baseline errors.
- [ ] Run `yarn check:admin-auth` and `git diff --check`.
- [ ] Run Aikido scan on every modified/new first-party source file.
- [ ] Browser-check admin edit/create and storefront rendering at desktop and mobile widths, including empty metadata, upload error, and image removal.
- [ ] Confirm migration `172_auction_product_details.sql` has been applied before persistence testing; refresh Supabase/PostgREST schema cache if the column is still missing.
