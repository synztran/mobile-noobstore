# Deployment Log

_Track what features/updates have been deployed to production._

---

## [v0.15.1] — 2026-08-04

**UX (checkout pickup):**
- Replaced the native `<input type="date">` pickup-date field (unusable on iOS: ignored `min`, no calendar affordance, inconsistent rendering) with a cross-platform wheel date picker via `react-wheel-scroller` (`WsDate`)
- Consistent look across browser/iOS/Android: iOS-style wheel in a bottom sheet (`display="bottom"` + `touchUi`), honoring `min`/`max` (earliest pickup date enforced in the wheel) and a 30-day horizon
- Kept the separate pickup-time `<select>` plus existing future-time/slot validation unchanged; reused the store's `minPickupDate` bound as the wheel `min`
- Stylesheets imported once in the root layout; removed the hand-rolled custom bottom-sheet `PickupDatePicker` component

## [v0.15.0] — 2026-08-03

**Features (voucher targeting & restrictions):**
- Voucher targeting in the admin form: restrict a voucher to specific products (`scope_type: product`), categories (`category`), or specific customers (`customer_ids`) — all via new type-to-search comboboxes (`AsyncMultiSelect`) that resolve preselected values on edit
- Customer-specific vouchers (`customer_ids`) are hidden from the public voucher list and auto-applied/validated against the signed-in user
- Product/category-scoped vouchers are surfaced only via the new `/api/vouchers/eligible` auto-apply flow (not in the public list)
- Shipping-method restriction (`applies_to_shipping_methods` on `vouchers`): a voucher with a configured list only applies when the checkout delivery method (standard/express/pickup) is in that list; empty/NULL = unrestricted (existing vouchers unaffected)
- Store-level cap on vouchers per order (`fees.max_vouchers_per_order`, default 2) — configurable in the admin fees page, enforced client-side + server-side in `/api/vouchers/apply` and checkout submit

**Features (checkout UX):**
- Auto-apply eligible scoped + customer vouchers on the checkout summary page via `/api/vouchers/eligible` (React Query), with shipping-method-aware filtering
- VoucherComponent refactored onto React Query (`useVoucherList`, `useEligibleVouchers`, `useFeesConfig`, `useApplyVouchers`) with state extracted into a `useVouchers` hook
- Applied vouchers are pruned when they become invalid for the current checkout context — switching shipping method (e.g. express-only freeship after switching to pickup), dropping below min order, or cart no longer matching the scope (`useDiscountStore.pruneAppliedVouchers`)

**Security/fixes:**
- `/api/checkout/submit` now server-side revalidates each applied voucher (status, dates, usage limits, customer targeting, shipping method, scope) and caps each discount at its matched-subset subtotal — client-tampered voucher payloads are stripped
- Admin vouchers table shows the new targeting columns (scope, product/category/excluded ids, customers, shipping methods) fixing "edit doesn't reload saved targeting"

**DB:**
- Migration 026: `fees.max_vouchers_per_order`, `vouchers.customer_ids` (+ GIN index)
- Migration 027: `vouchers.applies_to_shipping_methods`

**Testing:**
- Unit tests for `pruneAppliedVouchers` (shipping-method, min-order, no-op, full-clear)

## [v0.14.0] — 2026-08-01

**UI (shop search):**
- Replaced the full-screen search drawer with an inline search input that filters the shop grid live — focusing it reveals an expandable dropdown below the input (recent searches + quick category shortcuts), which hides once the user starts typing
- Category shortcuts now render as circular thumbnails (Next.js `Image`, first-letter fallback when no thumbnail) instead of text-only chips

**Features:**
- Recent searches persisted in `localStorage` (`noobstore-recent-searches`, max 8, deduped, most-recent-first): saved automatically once the debounced search settles (no Enter needed), reorder-to-front on chip tap, per-chip remove and "Xoá tất cả"
- Shared `useRecentSearches` hook drives both the shop dropdown and the floating search

## [v0.13.0] — 2026-08-01

**Performance (deployment):**
- Skip TypeScript check inside `next build` (`typescript.ignoreBuildErrors`) for web + admin — the duplicate `tsc` pass was a large chunk of the >2 min deploy; type safety is now enforced in CI instead
- CI type-check workflow (`.github/workflows/ci.yml`) on PRs/push: `yarn install --immutable` + web `type-check`
- Moved `supabase` (91 MB) and `shadcn` (2.3 MB) CLI tools to `devDependencies` so they're not installed for production builds
- `vercel.json` with `ignoreCommand: npx turbo-ignore --fallback=HEAD^1` — deployments are skipped entirely when neither app's code changed
- Vercel Turborepo remote caching is now active (automatic for Turbo projects) — unchanged apps restore build artifacts from the remote cache instead of rebuilding

**Performance (product detail page):**
- Product detail (`/shop/[slug]`) first paint no longer waits on below-fold data — "Thường được mua cùng" and "Sản phẩm liên quan" rails now stream in via nested `<Suspense>` slots (`ProductRail`, `RelatedProductsSection`, `BoughtTogetherSection`) instead of blocking behind a single boundary; main load reduced to the cached product detail + purchase count
- Kit pages: eliminated the duplicate child-products query — `getProductDetail` derives configurator groups from the child products already fetched by `getProductBySlug` (added `product_type` to `ComponentProductDetail`); `component_variant_rules` now Redis-cached via `getComponentRules` (60s TTL)
- Net: ~6 Supabase round-trips removed from the cold-cache critical path (FBT ×3, related ×2, child query ×1)

## [v0.12.0] — 2026-08-01

**Features:**
- Checkout store pickup ("Nhận tại cửa hàng"): new pickup delivery option with 30-min slot picker (08:00–19:00 daily); slot is restored when returning to the shipping step and cleared when switching delivery methods
- Orders now store `pickup_at`; pickup time shown on the order summary, order detail drawer, and admin order modal/shipping details
- Pre-order pickup: date/time fields are hidden when the cart contains pre-order items — replaced with "NoobStore sẽ chủ động liên hệ bạn" notice; `pickup_at` saved as null and the pickup-slot validation is skipped
- Unified order-tracking timeline (`OrderTrackingTimeline`) for all order types — replaces the pre-order-only timeline and the horizontal status stepper
  - Scenario-based rendering: only reached/passed steps are shown (cancelled without payment → just "Đặt hàng" + "Đã hủy"; cancelled/refunded append a terminal step)
  - Shows real step timestamps and expected-delivery ETA; loading spinner next to the title while the order is in progress
- Order-detail API now returns `paid_at`, `delivering_at`, `delivered_at`, `refunded_at`, `expected_delivery_at`, `shipping_method_id`, `pickup_at`
- Admin: multi-row component creation in the create-product form; `/api/product-components` accepts an array and inserts all rows at once
- Admin: manual Redis cache clearing — "Clear Products Cache" buttons on the dashboard and products header via `/api/cache` (replaces automatic invalidation)
- Auto-expanding "Ghi chú" textarea on checkout (`AutoResizeTextarea`)
- Facebook domain verification meta tag added

**Fixes:**
- Admin sanitization moved to `isomorphic-dompurify` (SSR-safe)
- City/district/ward selected state now uses a green check icon
- Admin `.env.example` documents Supabase service role + Upstash Redis vars

**Performance:**
- Checkout shipping page split into small `React.memo` components with stabilized callbacks — fewer re-renders on the shipping form

**Testing:**
- E2E checkout spec asserts the store-pickup option is present

## [v0.11.0] — 2026-07-30

**Features:**
- `max_quantity` column added to `products` table (DB migration 023) — per-cart limit for standard products
- Admin UI: `max_quantity` field on create/edit product forms + display on product cards
- Cart stock validation: cart API now rejects quantities exceeding `stock_quantity` (HTTP 409)
- Cart max-quantity validation: cart API rejects quantities exceeding `max_quantity` with separate error message ("Giới hạn sản phẩm cho mỗi đơn hàng")

**Performance:**
- Home page "Xem tất cả" links memoized via `React.memo` — prevents re-render on category filter changes
- `getProductStock` → `getProductEffectiveLimit` — fetches both `stock_quantity` and `max_quantity` in a single query

## [v0.10.0] — 2026-07-29

**Features:**
- QuickPickDrawer state management refactored — replaced `useReducer` with `useState` + direct React Query data; extracted `useQuickPickDrawer` hook
- Shop SEO: added `ShopSeo` component with structured data and meta tags
- Loading spinner in search input (`ShopControls`)
- Cart item reorder fix — items now maintain insertion order across page navigations

**Fixes:**
- Profile API called on every page load — removed mount-time `fetchProfile()` from `AuthProvider`; also skips `TOKEN_REFRESHED` events
- `NavigationOverlay` scroll restoration — body scroll position now correctly restored after overlay closes

**Performance:**
- `getQuickPickData` single-product path optimized (direct `supabase.from("products").select()`, skips array reshape)

## [v0.9.0] — 2026-07-28

**Features:**
- DB performance: added 5 indexes for product/product_variant/product_components queries
- Configurator query skip for non-kit products (reduces Supabase round-trips in QuickPickDrawer)

**Fixes:**
- `getQuickPickData` returning `min_price = 0` for products with zero-price variants (local `shapeRow` was missing `> 0` filter)
- Chunk 404s on first dev server start (switched to Webpack, added `.next` cleanup hooks)

**Performance:**
- Cache version prefix (`CACHE_VERSION=v1`) on all product Redis keys — auto-invalidates stale entries on deploy
- `/api/products` cache key now includes all filter params (category, price min/max, product types) to prevent cache collisions

## [v0.8.0] — 2026-07-06

**Features:**
- Support ticket feature: submit tickets with image attachments, admin reply flow
- Home page: Google reviews testimonials section, noteworthy/sale sections
- Auth: fixed useSearchParams Suspense boundary, fixed sign-in session sync after server-side auth
- Performance: Redis caching for product APIs, batch supplement fetching (N+1 fix for kit products)
- Deployment tracking: added deployment.md + interactive log script

**Fixes:**
- iOS UI bugs (viewport, scroll, layout)
- AuthProvider sign-in re-syncs session from cookies after successful API login

## [v0.7.0] — 2026-07-04

**Features:**
- iOS UI refinements and viewport handling

**Fixes:**
- Viewport and layout issues on real iOS devices

## [v0.6.0] — 2026-07-02

**Features:**
- Rate limiting for checkout endpoint
- Redis cache fine-tuning and missmatch fix
- Invoice service integration

**Fixes:**
- Checkout flow bug fixes
- Hydration mismatches resolved
- HTTP remotePatterns for Next.js Image

## [v0.5.0] — 2026-07-01

**Features:**
- Service page update
- UI view improvements across the app

**Testing:**
- E2E tests for register, login, add-to-cart, checkout flows

## [v0.4.0] — 2026-06-30

**Features:**
- New product type: gift (with gift_products linking)
- Text editor improvements for admin
- Checkout flow optimization
- iOS UI adjustments

**Fixes:**
- Products list missing component variants
- Text editor display issues

## [v0.3.0] — 2026-06-28

**Features:**
- Notification system and invoice page
- Product detail page with scrollable sections
- Product type gift (backend + admin)

**Fixes:**
- Manifest and logo configuration

## [v0.2.0] — 2026-06-20

**Features:**
- Discount price and tag system for products
- Gacha machine: 10x pull button with animation
- Discount/percentage display on product cards

**Fixes:**
- Gacha machine bugs and UI adjustments

## [v0.1.0] — 2026-06-07

**Features:**
- Admin UI overhaul (new dashboard layout)
- PWA push notifications setup
- Admin order actions (status management)
- General UI improvements and new layout

**Fixes:**
- Build errors for production
- Admin order action bugs

## [v0.0.0] — 2026-05-01

**Features:**
- Gacha machine integration (spin, rewards, history)
- Voucher system (create, apply to cart)
- Transaction order management
- Warning UI for out-of-stock / low stock
- Scrollable cart drawer
- Order status timeline

**Fixes:**
- Scroll bugs in cart drawer
- Production build issues
- General UI consistency
