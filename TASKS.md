# Night-worker backlog

**Scope:** Planning only; tasks are independent unless noted. Start with the first unchecked task. When implementing, inspect current code and tests first; adjust the file list only when evidence requires it. Do not add packages without approval. For external research tasks, cite sources and do not invent/download unverified assets.

## `apps/admin`

- [x] **Optimize admin product, variant, component, and order queries**
  - **Files:** `apps/admin/src/app/(admin)/products/page.tsx`, `apps/admin/src/app/(admin)/products/variants/page.tsx`, `apps/admin/src/app/(admin)/products/components/page.tsx`, `apps/admin/src/lib/orders-list-query.ts`, `apps/admin/src/app/(admin)/orders/page.tsx`; relevant query tests under `apps/admin/src/lib/` and `apps/admin/src/app/api/`.
  - **Requirements:** Measure/inspect existing Supabase query plans and result sizes before changing them. Remove duplicate selects/order clauses, avoid fetching unbounded product/component data when server-side filtering/pagination can preserve current UI behavior, select only needed columns, and preserve counts, filters, sort order, page links, and order status behavior. Avoid N+1 requests. Report any index/migration recommendation separately; do not add speculative indexes.
  - **Verify:** Add/update tests for filters, pagination and empty/error results; run admin typecheck and relevant unit tests. Compare query count/returned row bounds for representative pages and confirm current filter/sort/pagination behavior.

- [x] **Repair variants search switching and loading feedback**
  - **Files:** `apps/admin/src/components/variants/VariantsHeader.tsx`, `apps/admin/src/app/(admin)/products/variants/page.tsx`.
  - **Requirements:** Search by product must query correctly immediately after switching from variant search (and vice versa), including when query text is already present. Reset page to 1 when query or search field changes; keep URL params synchronized. Show an accessible pending/loading indicator while navigation/query is in flight, without losing the entered text or blocking typing. Handle empty query and no-match results.
  - **Verify:** Add a regression test or documented reproducible test for product → variant → product switching with existing text; verify loading state appears during a delayed navigation, URL has the expected `q`/`by`/`page`, and results match the selected field. Run admin typecheck/tests.

- [!] **Complete admin service management for storefront services**
  - **Files:** `apps/admin/src/app/(admin)/services/page.tsx`, `apps/admin/src/components/services/ServicesClient.tsx`, `apps/admin/src/components/services/EditServiceModal.tsx`, `apps/admin/src/components/services/ServiceConfigModal.tsx`, `apps/admin/src/components/services/ServiceOptionModal.tsx`, related service API routes in `apps/admin/src/app/api/`, and `apps/admin/src/components/services/serviceTypes.ts`.
  - **Requirements:** Audit existing service CRUD first and fill only missing capabilities. Admin must create a service and edit its base price, estimated/handling time, active/booking visibility, and options/option values. Validate required fields, non-negative VND prices/time, unique slug, option ordering, and safe empty/duplicate inputs. Keep existing storefront schema/contract compatible; enforce admin authorization in every mutation endpoint and show actionable inline validation/server errors.
  - **Verify:** Add route/helper tests for create, edit, invalid values, duplicate slug, unauthorized requests, and option persistence. Run admin typecheck/tests; manually verify create/edit/list and that saved service data is returned by the existing web services flow.

- [!] **Build the first mid-man transaction workflow safely**
  - **Files:** New admin route/page and components under `apps/admin/src/app/(admin)/mid-man/` and `apps/admin/src/components/mid-man/`; protected API under `apps/admin/src/app/api/mid-man/`; schema/migration under `supabase/migrations/` only after confirming the existing transaction/order model; navigation in `apps/admin/src/components/layout/AdminLayout.tsx`; tests alongside route/domain helpers.
  - **Requirements:** Before implementation, define the MVP lifecycle and permissions: create a case for two unrelated customers, record parties/agreed terms/amount, track pending → funded/held → released/refunded/disputed states, record operator and timestamp for every transition, and provide an audit trail. Do not claim escrow/payment custody unless an existing payment integration actually holds funds. Never expose one customer's private data to the other; validate allowed state transitions and prevent double release/refund. If the real funds-holding model is unresolved, implement only a clearly-labelled case-tracking prototype and document the limitation—do not move money.
  - **Verify:** Tests cover role/auth checks, transition matrix, duplicate/conflicting transitions, audit records, and private data boundaries. Run migrations in a disposable/local database if available, admin typecheck/tests, and manually verify the lifecycle UI. Clearly document whether this is tracking-only or truly funds-backed.

- [!] **Manage existing and generated invoices in admin**
  - **Files:** New page/components under `apps/admin/src/app/(admin)/invoices/` and `apps/admin/src/components/invoices/`; existing generator `apps/admin/src/app/api/invoices/generate/route.ts` and `apps/admin/src/lib/invoice*`; new protected APIs under `apps/admin/src/app/api/invoices/`; invoice storage bucket/config references and focused tests.
  - **Requirements:** Inspect current invoice generator and Supabase Storage bucket/path convention first. List only invoice objects, show filename/order association, creation time and preview/download links, with pagination and empty/error states. Support editing the existing invoice layout/template and previewing changes before save; preserve current generated invoice format and generation behavior. Validate template inputs and restrict list/read/write operations to authorized admins. Do not expose service-role credentials or allow arbitrary storage paths.
  - **Verify:** Tests cover storage listing/path validation, template validation, unauthorized access, and generation compatibility. Run admin typecheck/tests; manually generate, list, preview/download, and edit a template without changing an unrelated invoice.

- [!] **Configure home hero campaigns for mobile and desktop**
  - **Files:** `apps/admin/src/app/(admin)/content/page.tsx`, `apps/admin/src/components/content/CampaignModal.tsx`, `apps/admin/src/app/api/content/campaigns/route.ts`, `apps/admin/src/app/api/content/campaigns/[id]/route.ts`, web rendering in `apps/web/src/components/home/HeroSection.tsx` and `apps/web/src/lib/hero-server.ts`, plus shared types/migration only if existing schema cannot represent the configuration.
  - **Requirements:** Extend the current hero campaign editor (do not create a parallel system) to configure desktop and mobile artwork independently, editable title/subtitle/CTA, and responsive text position/alignment. Preserve existing campaigns through safe defaults and existing cache invalidation. Validate URLs, text lengths, and position values; provide responsive preview and clear image fallback when one viewport asset is absent.
  - **Verify:** Tests cover API validation, legacy rows/defaults and cache invalidation. Run admin/web typecheck and relevant tests; manually preview desktop/mobile configurations and verify storefront chooses the expected artwork/layout at both breakpoints.

## `apps/web`

- [!] **Diagnose and fix requests that hang during page rendering**
  - **Files:** Identify the blocking server data path from `apps/web/src/app/(main)/page.tsx`, `apps/web/src/lib/hero-server.ts`, `apps/web/src/modules/products/server/`, API fetch/client helpers in `apps/web/src/lib/api/`, and the specific route/query found to stall; add regression tests beside the affected helper/route.
  - **Requirements:** Reproduce or instrument the reported refresh stall (progress bar remains at 12%) and identify the exact unresolved request rather than adding a blanket timeout. Ensure each blocking fetch/query has bounded time, cancellation where supported, and a deliberate fallback/error state so a non-critical upstream/API failure cannot prevent the page shell from rendering. Preserve critical checkout/auth correctness; do not silently convert required data failures into success. Record the identified root cause and distinguish server render requests from browser requests.
  - **Verify:** Add a regression test using a delayed/hanging dependency and assert bounded completion/fallback; run web typecheck and relevant tests. Verify refresh renders the shell and reports/logs the failed dependency without an indefinite loading state; check normal data and critical failure paths.

- [x] **Bound desktop push-notification prompt width**
  - **Files:** `apps/web/src/components/notifications/PushNotificationPrompt.tsx`.
  - **Requirements:** Keep current mobile full-width-with-gutters behavior; on desktop constrain the prompt to a readable maximum width and anchor it consistently without overflow or covering key controls. Preserve dismiss/subscribe behavior and responsive safe spacing.
  - **Verify:** At mobile and desktop viewport widths, confirm prompt width/placement, no horizontal overflow, keyboard access, and subscribe/dismiss behavior. Run web typecheck and relevant UI tests if present.

- [x] **Skip authenticated-only calendar and notification queries for signed-out users**
  - **Files:** `apps/web/src/modules/checkin/client/queries.ts`, `apps/web/src/modules/checkin/ui/CheckinCalendar.tsx`, `apps/web/src/modules/desktop/ui/notifications/DesktopNotificationsDrawer.tsx`, notification query consumers and `apps/web/src/lib/react-query/notification/api/useNotificationQueries.ts`.
  - **Requirements:** Audit all consumers of `/api/checkin/calendar` and `/api/notifications`; use the existing `useAuth()` state to set query `enabled` only after auth loading completes and a user exists. Clear/avoid showing a prior user's cached private data after sign-out or account switch. Keep public check-in rewards enabled only if its route is actually public. Do not change API authorization or return fake success from protected endpoints.
  - **Verify:** Tests or a focused manual matrix confirms signed-out state makes no calendar/notification request, signed-in state fetches normally, auth-loading does not flash 401/error UI, and sign-out/account switch cannot display stale notifications. Run web typecheck/tests.

- [x] **Normalize home page section horizontal padding to 16px**
  - **Files:** `apps/web/src/app/(main)/page.tsx` and only the home section components/wrappers whose rendered horizontal padding conflicts with the page's 16px mobile gutter (identify by inspection, likely under `apps/web/src/components/home/`).
  - **Requirements:** Make home sections align to a consistent 16px mobile horizontal gutter, removing nested/doubled 24–40px padding. Preserve intentional full-bleed hero/artwork and desktop layout; avoid changing vertical spacing or other routes.
  - **Verify:** Inspect home at 320px, 390px, tablet and desktop widths; all non-full-bleed section content aligns to the same 16px mobile edge with no double padding/overflow. Run web typecheck and UI detector on changed files.

- [x] **Disable the mobile-device recommendation popup**
  - **Files:** `apps/web/src/app/layout.tsx`, `apps/web/src/components/warning-modal/MobileViewportGuard.tsx`, and popup component only if needed.
  - **Requirements:** Stop rendering the popup “Sử dụng thiết bị di động để có trải nghiệm tốt nhất!” on desktop while preserving unrelated viewport/layout behavior. Remove dead imports/state only if they become unused; do not remove other warnings.
  - **Verify:** Confirm popup is absent on desktop and mobile and no hydration/runtime warnings occur. Run web typecheck and relevant tests.

- [!] **Create two structurally distinct `/about` page mockups**
  - **Files:** New mockup artifacts under `apps/web/design-mockups/about/` (two standalone HTML/CSS mockups or the repository's existing mockup convention); inspect `apps/web/src/app/` and existing design assets before choosing format. Do not replace a production route in this task.
  - **Requirements:** Create at least two meaningfully different page structures and section sequences, not just color variations. Include Vietnamese brand story, trust/quality proof, team/store context, and clear links/CTA; use responsive desktop/mobile layouts and existing NoobStore visual language. Label the files as mockups and document how to preview them.
  - **Verify:** Open both mockups at mobile and desktop sizes; confirm distinct information architecture, usable links/CTA, accessible contrast/heading order, and no horizontal overflow. Keep artifacts isolated from production code.

- [x] **Create two desktop product-card UI mockups**
  - **Files:** New mockup artifacts under `apps/web/design-mockups/product-card/` (or existing mockup convention); reference `apps/web/src/modules/products/ui/product/ProductCard.tsx`, `ProductCardDetails.tsx`, and `ProductCardPricing.tsx` without changing them.
  - **Requirements:** Produce two distinct desktop card concepts suitable for the current product data (image, name, price/discount, stock/variant state, rating when real data exists, and action). Keep mobile behavior out of scope; avoid fabricating product claims. Include responsive constraints and preview instructions; do not ship either concept into production.
  - **Verify:** Preview both at common desktop widths and a narrow fallback width; verify readable hierarchy, complete data/action states, accessible controls and no overflow. Confirm production files remain unchanged.

- [!] **Investigate blocked Google Analytics script behavior**
  - **Files:** `apps/web/src/components/ui/GoogleAnalytics.tsx`, analytics configuration/env references, CSP/header configuration and documentation/tests if needed.
  - **Requirements:** Determine whether `ERR_BLOCKED_BY_CONTENT_BLOCKER` is caused by a browser extension/content blocker or by app configuration using reproducible checks. Do not attempt to bypass blockers. Ensure the app handles blocked script loading without runtime errors and analytics remains consent/configuration compliant. Document what is and is not fixable in application code.
  - **Verify:** Test with script blocked and allowed; app must render without uncaught errors, and GA initializes only under existing consent/config rules. Add a test for failure handling where practical and document the diagnosis.

- [!] **Trace and diagnose `backendManager.js` renderer error**
  - **Files:** Identify the package/extension/runtime source from source maps, lockfile and browser stack; likely investigate `apps/web/package.json`, `yarn.lock`, `apps/web/src/app/layout.tsx`, product/configurator renderers and relevant integration tests. Change only the verified source file.
  - **Requirements:** Reproduce `Uncaught TypeError: Cannot read properties of undefined (reading 'has')` at `registerRenderer (backendManager.js:1:13379)`, identify whether it originates in app code, a dependency, browser extension, or injected third-party script, then fix/update configuration only when attributable to this app and compatible without adding/upgrading packages absent approval. If external, document a reproducible isolation result instead of adding speculative guards.
  - **Verify:** Provide reproduction/isolation steps and a regression test or browser check for the affected renderer. Confirm no new console error with extensions disabled and identify behavior with the suspected extension/integration enabled. Run web typecheck/tests if app code changes.

- [!] **Find and remove only obsolete CSP-warning console logs**
  - **Files:** Search `apps/web/src/**/*.{ts,tsx,js,jsx}` and relevant root/app scripts for `Applying inline style violates the following Content Security Policy directive`; inspect hits and dynamically generated sources before changing.
  - **Requirements:** Trace the exact log source and determine whether it is an intentional diagnostic or production noise. Remove only redundant application-owned `console.log` statements that produce this message; do not suppress CSP violations, remove meaningful error/warning logs, or edit dependencies/vendor code blindly. If the message is browser-generated and no app log exists, document that and make no unrelated cleanup.
  - **Verify:** Search again for the exact message and related logging source; reproduce with current CSP configuration and confirm real CSP violations remain observable. Run web lint/typecheck and tests for changed files.

- [x] **Support selecting multiple shop filters**
  - **Files:** `apps/web/src/modules/products/ui/product/FilterOverlay.tsx`, `apps/web/src/modules/products/ui/shop/ShopFilterPanel.tsx`, `apps/web/src/modules/products/client/` shop query/state helpers, and relevant shop route/page/API tests.
  - **Requirements:** Confirm which filters currently enforce single selection and implement multi-select for the intended category/brand filters consistently on mobile and desktop. Update `FilterState`, URL serialization/parsing, apply/clear behavior and query filtering together. Preserve price range semantics, deep links/back-forward, selected counts, duplicate brand normalization, empty selections and existing single-value URLs as backward-compatible input. Clarify OR-within-group and AND-across-groups semantics in UI/code.
  - **Verify:** Unit tests cover multiple values, URL round-trip, legacy single-value URL, clear/apply, back-forward and correct product result semantics. Manually verify mobile overlay and desktop panel; run web typecheck/tests.

- [ ] **Replace hard-coded product-card rating and distinguish rating sources**
  - **Files:** `apps/web/src/modules/products/ui/product/ProductView.tsx`, `apps/web/src/modules/products/ui/product/ProductRatingSection.tsx`, existing review query/API under `apps/web/src/lib/react-query/review/` and `apps/web/src/app/api/products/`, product types only if required.
  - **Requirements:** Confirm the “4.9 (28 đánh giá)” badge is hard-coded (currently visible in `ProductView.tsx`) and trace the actual customer-review aggregate source. Replace it with the real review average/count; show a clear empty state/no badge when there are no reviews. If Google/external ratings exist, label them explicitly as a separate source and never merge them with NoobStore customer reviews. Avoid fabricated defaults and handle loading/error states without layout jumps.
  - **Verify:** Tests cover zero, one and multiple reviews, aggregate rounding, loading/error and external-vs-store rating labels. Manually compare badge values to the review API and the reviews section; run web typecheck/tests.

- [ ] **Research and add verified keyboard documentation resources**
  - **Files:** `apps/web/src/app/(main)/documents/page.tsx`, existing document data/types/components and any source data file discovered by inspection; tests for document filtering/rendering if present. Add/update assets only in the existing approved public/storage convention.
  - **Requirements:** Research and source-link official manufacturer/distributor pages or verifiable community-maintained repositories for: NEO 60/65/75/80 standard and CU; Foxlab firmware and plate files; Singa-distributed keyboards' firmware and plate files; Daji firmware, plate files and user guides; Mersiri firmware, plate files and user guides. Record model, resource type, direct URL, source/attribution, access date and compatibility caveat. Distinguish unavailable/unverified resources; do not mirror copyrighted files or link unsafe executables. Preserve current document page UX and add searchable/filterable entries using its existing data shape.
  - **Verify:** Every listed URL is reachable and attributable to a credible source; model/type labels and caveats are accurate; broken/unknown resources are not presented as verified. Run web typecheck/tests and manually verify filters/links on `/documents`.
