# Auction Admin Details Expansion Design

## Goal

Complete the auction admin create/edit workflow and storefront preview with auction pricing, eligibility rules, predefined condition grades, and inspection photos stored separately from product/variant images.

## Scope and behavior

- Keep auction product details in the existing nullable `auction_products.product_details` JSONB field; extend its validated shape with `condition.images: string[]` for inspection photos.
- Grade is a selection of `S`, `A`, `B`, `C`, or `D`, using the descriptions already shown in the storefront Grade rubric. Persist only the grade key; storefront continues displaying its existing rubric and selected grade.
- Editing an auction can update `bin_price`, `required_customer_level`, `required_order_count`, `limit_bids_per_user`, and `max_bids_per_user`.
- Starting price and increment settings are editable only when the auction has zero bids and is not active. They are immutable for active or previously bid-on auctions. Do not alter `current_price` as part of an edit.
- Inspection photos are uploaded independently through the existing admin image-upload endpoint/storage bucket using an auction-specific path. They are saved in `product_details.condition.images`, rendered in the inspection photo grid, and are never sourced from product or variant images. Legacy records without `condition.images` continue working and show no inspection-photo section.
- Preview mirrors storefront sections: starting price, increment, optional BIN, eligibility summary, product specs, condition grade and notes, dedicated inspection photos, and accessories. Empty optional detail sections remain hidden.
- No new package.

## Validation and failure behavior

- Extend admin and web metadata parsers to validate image URL arrays with the same maximum item count and text length constraints as other metadata; only HTTP(S) public URLs are accepted.
- Reuse existing upload file-type and 5 MB limit; surface upload errors without losing existing metadata. Removing an image removes it from the auction metadata but does not delete shared storage objects.
- Validate editable numeric auction fields at the admin API boundary and enforce the no-bid/non-active restriction server-side for starting price and increment edits. Return a stable customer-safe error code/message for rejection.
- Existing create behavior and legacy auction data remain valid.

## Data flow

Admin form loads auction details and bid count, uploads selected inspection images through `/api/upload`, then submits metadata and permitted auction fields through the existing auction routes. The web auction detail loader returns the extended metadata; `AuctionDetailClient` renders inspection images from `condition.images` only.

## Verification

- Unit tests cover grade validation, image URL validation and legacy metadata parsing.
- Admin API tests cover editable fields and reject starting-price/increment changes when active or bids exist.
- Web tests cover dedicated inspection images and absence of a photo section for legacy/empty metadata.
- Run web type-check/unit tests, admin type-check (record known unrelated baseline errors), admin auth guard, `git diff --check`, and Aikido scan on changed files.
- Verify admin create/edit and storefront preview/render in browser at desktop and mobile widths.

## Files likely touched

- `apps/admin/src/components/auctions/AuctionFormModal.tsx`
- `apps/admin/src/app/api/auctions/route.ts`
- `apps/admin/src/app/api/auctions/[id]/route.ts`
- `apps/admin/src/lib/auction-product-details.ts` and tests
- `apps/admin/src/types/auction.ts`
- `apps/web/src/modules/auction/product-details.ts` and tests
- `apps/web/src/modules/auction/types.ts`
- `apps/web/src/modules/auction/server/queries.ts`
- `apps/web/src/modules/auction/ui/AuctionDetailClient.tsx`
- New migration only if a separate typed column is required; current design needs none because existing JSONB column is reused.

## Open operational prerequisite

Apply migration `172_auction_product_details.sql` to the configured Supabase project before exercising persistence. If PostgREST continues reporting a missing column afterward, refresh its schema cache.
