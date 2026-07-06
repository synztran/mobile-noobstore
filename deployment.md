# Deployment Log

_Track what features/updates have been deployed to production._

---

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
