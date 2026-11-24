# Auction Admin Edit and Inspection Captions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let admins edit supported auction scheduling/status/settlement fields and add visible captions to inspection photos without breaking existing auction records.

**Architecture:** Keep photo URLs in `condition.images: string[]` and add optional, index-aligned `condition.image_captions: string[]`; parsers normalize legacy records to empty captions. Extend admin edit form/API and the `admin_update_auction` RPC for the approved edit fields, with server-side validation and existing price-lock behavior preserved. Add a new migration only; do not modify or apply historical/remote migrations.

**Tech Stack:** Next.js App Router, React, TypeScript, Supabase Postgres JSONB/RPC, Vitest, Tailwind.

**Spec:** `docs/superpowers/specs/2026-11-23-auction-admin-details-expansion-design.md` plus approved scope in chat (admin edit fields and backward-compatible inspection image captions).

## Global Constraints

- Keep `auction_products.product_details` JSONB; no new dependency.
- Keep `condition.images` as HTTP(S) URL strings; add optional parallel captions, maximum 20, each at most 500 characters.
- Legacy records without `condition.image_captions` remain valid and render without caption text.
- Preserve price lock: starting price and increment edits rejected for active auctions or any auction with bids; never edit `current_price`.
- Every changed/added SQL RPC must return stable `error_code` values on failures.
- Add a new suffixed migration; never overwrite existing migration files or apply remote migrations.
- Admin endpoint remains protected by existing middleware/auth conventions.

## Review Focus

- Legacy metadata has no captions: parser and rendering must remain valid and omit caption display.
- Caption array length differs from images: normalize missing entries to blank; reject extra captions beyond image count.
- Captions contain whitespace/overlength data: trim, allow blank, cap at 500 chars, reject overlength entries.
- Start/end timestamps become invalid together: API must reject `ends_at <= starts_at` after combining submitted and persisted values.
- Edit attempts alter restricted price fields on active/bid-on auctions: RPC must reject atomically with stable error code and leave row unchanged.

---

## File Structure

- `apps/admin/src/components/auctions/AuctionFormModal.tsx` — populate and submit approved edit fields; caption input per inspection image.
- `apps/admin/src/app/api/auctions/[id]/route.ts` — validate update payload and timestamps, pass allowed fields to RPC.
- `apps/admin/src/app/api/auctions/[id]/route.test.ts` — extend existing API validation and payload tests.
- `apps/admin/src/lib/auction-product-details.ts` and `apps/admin/src/lib/auction-product-details.test.ts` — admin-side caption parsing/normalization.
- `apps/admin/src/types/auction.ts` — optional caption list in contract.
- `apps/web/src/modules/auction/product-details.ts` and `apps/web/src/modules/auction/product-details.test.ts` — web parser compatibility and validation.
- `apps/web/src/modules/auction/types.ts` — caption list contract.
- `apps/web/src/modules/auction/ui/AuctionDetailClient.tsx` — render each nonblank caption below matching inspection photo.
- `supabase/migrations/176_admin_update_auction_editable_fields.sql` — update RPC fields, timestamp/order checks, stable `error_code` responses.

## Task 1: Preserve Caption-Compatible Metadata Contract

**Files:**
- Modify: `apps/admin/src/types/auction.ts`
- Modify: `apps/admin/src/lib/auction-product-details.ts`
- Modify: `apps/admin/src/lib/auction-product-details.test.ts`
- Modify: `apps/web/src/modules/auction/product-details.ts`
- Modify: `apps/web/src/modules/auction/product-details.test.ts`
- Modify: `apps/web/src/modules/auction/types.ts`

**Interfaces:**
- `condition.image_captions?: string[]` aligned by index with `condition.images`.
- Parser output normalizes to a caption entry per image, blank when absent; both string URL legacy values and the new parallel array remain accepted.

- [ ] Add parser tests for legacy missing captions, trimmed captions, blank captions, excess caption count, and >500-character values.
- [ ] Run focused Vitest files directly with workspace Vitest (`yarn vitest run --config apps/admin/vitest.config.mts apps/admin/src/lib/auction-product-details.test.ts` and web equivalent); confirm new tests fail before implementation.
- [ ] Implement optional caption parsing and normalized output in both app parsers/types.
- [ ] Run focused parser tests with `yarn vitest run --config apps/admin/vitest.config.mts apps/admin/src/lib/auction-product-details.test.ts` and web equivalent; confirm pass.

## Task 2: Admin Form Caption Editing and Complete Edit Payload

**Files:**
- Modify: `apps/admin/src/components/auctions/AuctionFormModal.tsx`

**Interfaces:**
- Edit form loads `starts_at`, `ends_at`, `anti_snipe_minutes`, `winner_checkout_hours`, `max_winner_cascades`, `status`, `is_featured`.
- Caption values stored in `product_details.condition.image_captions`, parallel to `condition.images`.

- [ ] Add focused component tests using existing test dependencies/conventions for edit hydration and serialized payload; include an empty legacy captions case. If component harness is unavailable, factor payload construction into a small pure helper and test that helper.
- [ ] Run focused test and confirm expected failure before implementation.
- [ ] Hydrate approved fields from GET response; show controls in edit mode and submit all seven fields.
- [ ] Add caption inputs to each inspection image row; preserve/reorder captions with image URL when images move, and submit captions alongside URLs.
- [ ] Verify removing an image removes matching caption from submitted metadata, while empty captions stay valid.
- [ ] Run focused tests and admin type-check.

## Task 3: Validate Update API and Extend RPC via New Migration

**Files:**
- Modify: `apps/admin/src/app/api/auctions/[id]/route.ts`
- Test: `apps/admin/src/app/api/auctions/[id]/route.test.ts`
- Add: `supabase/migrations/176_admin_update_auction_editable_fields.sql`

**Interfaces:**
- PUT accepts `starts_at`, `ends_at`, `anti_snipe_minutes`, `winner_checkout_hours`, `max_winner_cascades`, `status`, `is_featured`, and `product_details` alongside existing fields.
- RPC function signature stays `admin_update_auction(UUID, JSONB, BOOLEAN)`.
- Stable failures use JSON `{ success: false, error_code, message }`; preserve existing API response compatibility where tests/contracts require it.

- [ ] Add API tests for valid edit payload, invalid status, invalid timestamps, invalid nonnegative/positive integer bounds, partial timestamp update validated against existing row, and forwarding captions in product_details.
- [ ] Run focused route tests; confirm new cases fail before code changes.
- [ ] Extend PUT validation: valid status enum; ISO timestamps; `ends_at > starts_at` using combined submitted/current values; `anti_snipe_minutes >= 0`; `winner_checkout_hours > 0`; `max_winner_cascades >= 0`; booleans validated rather than truthy-coerced.
- [ ] Keep start-price/increment fields under existing conditional price-lock path and do not include `current_price` in updates.
- [ ] Add migration `176_admin_update_auction_editable_fields.sql`: replace RPC definition, persist approved fields, preserve existing lock/BIN logic, reject invalid timing/ranges atomically, and use stable `error_code` for each failure.
- [ ] Add SQL-level validation notes/tests if repo has migration test harness; otherwise verify migration statically and document remote application remains pending.
- [ ] Run route tests, admin type-check, and `yarn check:admin-auth`.

## Task 4: Render Captions and Verify End-to-End Contracts

**Files:**
- Modify: `apps/web/src/modules/auction/ui/AuctionDetailClient.tsx`
- Tests: existing auction detail component tests, or add focused test at established module test location.

**Interfaces:**
- Storefront renders nonblank caption under corresponding `condition.images[index]`.
- Legacy/missing/blank caption produces no visible caption element; image alt remains available.

- [ ] Add rendering tests for caption visible under matching image and legacy no-caption behavior.
- [ ] Run focused tests; confirm fail before implementation.
- [ ] Render nonblank caption as text below image in inspection grid with safe truncation/wrapping; keep image alt and selection behavior unchanged.
- [ ] Run web unit tests and type-check.
- [ ] Verify admin create/edit payload shape and storefront rendering at mobile/desktop widths when local apps are available; do not apply remote migrations.
- [ ] Run `git diff --check`, Aikido scan on all changed first-party paths, and Impeccable detector on changed web UI markup.

## Final Checks

- Admin: unit tests, type-check, `yarn check:admin-auth`.
- Web: unit tests and `yarn --cwd apps/web type-check`.
- Security: Aikido scan all modified first-party files.
- UI: Impeccable detector; browser verification at mobile and desktop if apps can run.
- SQL: review new migration and report explicitly that remote deployment was not performed.
