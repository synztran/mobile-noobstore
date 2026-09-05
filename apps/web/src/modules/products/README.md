# Module: products

> Reference implementation of the module layout. Every domain module
> (`src/modules/<domain>/`) carries a README like this one — see
> `docs/module-readme.template.md` for the blank template.

**Purpose:** everything that reads, shapes, searches, or renders **catalog
products** — the product list/rails, the product detail page, the kit
configurator (component groups + conditional rules), sales/flash-sales,
search suggestions, quick-pick, gifts, and recently-viewed.

**Owns the DB tables:** `products`, `product_variants`, `product_components`,
`component_variant_rules`, `gift_products`. Reviews, wishlist, cart, and stock
writing live in other domains.

## Layout

```
modules/products/
  types.ts        contract types — importable by every layer, imported by nothing below
  server/         server-only (import "server-only"); Supabase reads + shaping
    queries.ts        low-level DB reads + row shaping (the "query service")
    ssr.ts            React.cache() helpers for Server Components / pages
    sale.ts           on-sale product loader
    flash-sale.ts     flash-sale loaders
    detail.ts         full product-detail loader (serves GET /api/products/[slug])
    configurator.ts   kit configurator loader (serves GET .../configurator)
    queries.test.ts
  client/         client-only ("use client"); react-query + non-UI state
    query-keys.ts     productQueryKeys + shopQueryKeys factories (merged into appQueryKeys)
    queries.ts        useQuickPick / useProductSearch / useRecentlyViewedProducts
    shop-infinite.ts  useShopInfiniteQuery + buildShopUrl / buildShopFilters / Filters
    useProductViewData.ts   selection+stock+add-to-cart state machine for the detail page
    useQuickPickDrawer*     lives in ui/product/ (drawer-local)
    useShopControls.ts / useRecentlyViewed.ts / useRecentSearches.ts / useSearchFloating.ts
  ui/             components, split by surface
    product/          detail page pieces: ProductView, ProductConfigurator, ProductCard, QuickPickDrawer, …
    shop/             shop list page: ShopPageClient, ShopControls, SortSheet, CategoryBrowser, ShopSeo, ShopTour
    search/           SearchPageClient
    sale/             SaleProductsSection
    recently-viewed/  RecentlyViewedRail
```

`\*` — hooks tightly coupled to a single component (badges, quick-pick drawer)
live beside it under `ui/` instead of in `client/`.

## Rules that keep this clean

1. **API routes are thin.** `app/api/products/**/route.ts` parse params → call
   a `server/` function → respond. No DB access, no shaping, **no type exports**
   (types come from `types.ts`).
2. **Server Components never fetch over HTTP** — they call `server/ssr.ts`
   directly (`cache()` dedupes per request).
3. **Client Components never touch Supabase** — they use react-query hooks in
   `client/`, which fetch the API routes above.
4. **Never import `server/` from a hook/component.** The `server-only` import
   turns that mistake into a build error.
5. Cross-cutting cart shapes (`Product`, `SelectedComponent`, …) are still
   re-exported from `@/lib/data` for the cart store — see types.ts header.

## Data flow

```
Server page  /shop, /shop/[slug], /search
        │  direct call (no HTTP)
        ▼
server/ssr.ts ──► server/queries.ts ──► Supabase (public client, RLS)
                        ▲
Client page / client comps            │
        │ useQuery / useInfiniteQuery │
        ▼                             │
client/*.ts ──fetch──► app/api/products/**  (thin)  ──► server/*.ts
```

## API surface map

### Public contract types (`types.ts`) — the only home for product types

| Group | Symbols |
|---|---|
| Product kinds | `ProductType`, `SortOption` |
| Shared leaves | `ITag`, `PreOrderConfig` |
| Cart-facing (legacy) | `Product`, `ProductVariant`, `SelectedComponent` (also re-exported by `@/lib/data`) |
| List contract | `ShopVariant`, `ShopProduct`, `ProductsResponse` |
| Detail contract | `ShopVariantDetail`, `ComponentProductDetail`, `ProductComponentDetail`, `ProductDetail` |
| Configurator contract | `ConfiguratorVariant`, `ConfiguratorGroup`, `ComponentVariantRule`, `ConfiguratorResponse` |
| Search / Gift | `ProductSuggestion`, `GiftProductInfo` |

### Server (`server/`)

| Symbol | File | What it does |
|---|---|---|
| `getProductListByFilters`, `getProductsByIds`, `fetchKitSupplements`, `fetchGiftSupplement`, `descriptionToExcerpt` | `queries.ts` | Core DB reads + row shaping. List rows come back as `ProductListItem` (≈ `ShopProduct` + `discount_*`/`created_at`); callers cast to the public `ShopProduct` |
| `getProducts`, `getProductBySlug`, `getProductDetail`, `getBrands`, `getCategories`, `getProductSeoData`, `getNoteworthyProducts`, `getRelatedProducts`, `getQuickPickData`, `getNewestProducts`, `getFrequentlyBoughtTogether`, `getProductPurchaseCount`, `getComponentRules` | `ssr.ts` | Server-Component helpers, all wrapped in React `cache()`. `getProductDetail(slug)` returns `{ product, componentGroups, componentRules }` for the detail page SSR |
| `getSaleProducts` | `sale.ts` | Filters products that are currently discounted |
| `getFlashSaleProducts`, `getSoonestFlashSale` | `flash-sale.ts` | Flash-sale strips |
| `getProductDetailData(slug)` | `detail.ts` | Full `ProductDetail` for **GET /api/products/[slug]** — Redis-cached under `:product-detail:<slug>` (300s) |
| `getConfiguratorData(slug)` | `configurator.ts` | Groups + conditional rules for the kit configurator UI |

### Client (`client/`)

| Symbol | What it does |
|---|---|
| `useQuickPick`, `useProductSearch`, `useRecentlyViewedProducts` | react-query hooks → `/api/products/quick-pick`, `/search`, list-by-ids |
| `useShopInfiniteQuery` (+ `buildShopUrl`, `buildShopFilters`, `Filters`) | infinite scroll for shop/search grids → `/api/products` |
| `useProductViewData(product, groups, rules)` | Big state machine for the detail page: variant/configurator selection, `effectiveStockQuantity`, disabled variants, `handleAddToCart` (adds via cart mutations, GA, toast) |
| `useShopControls`, `useRecentSearches`, `useSearchFloating`, `useRecentlyViewed` | shop controls + search memory + recently-viewed rail |
| `productQueryKeys`, `shopQueryKeys` | key factories merged into `appQueryKeys` in `src/lib/react-query/root.ts` |

### UI surfaces

| Surface | Components (key ones) |
|---|---|
| Shop list | `ShopPageClient`, `ShopControls`, `SortSheet`, `CategoryBrowser`, `ShopSeo`, `ShopTour`, `FilterOverlay` |
| Product detail | `ProductView` (entry, client), `HeroImageGallery`, `ProductConfigurator`, `SelectedConditionSummary`, `ProductBadges`/`useProductBadges`, `ProductInfoTabs`, `AddToCartButton`, `StockAlertButton`, `ShareButton`, `StickyProductBar`, `BoughtTogetherSection`, `RelatedProductsSection` |
| Cards / rails | `ProductCard` (+ `ProductCardDetails`/`ProductCardPricing`), `ProductRail`, `DiscountBadge`, `SaleCountdown`, `ProductTags` |
| Kit configurator | `ProductConfigurator`, `QuickPickDrawer` + `useQuickPickDrawer`, `useProductViewData` |
| Search | `SearchPageClient` |
| Recently viewed | `RecentlyViewedRail` |
| Home (reused) | `ProductCard`, `SaleCountdown`, `FlashSaleStrip` (components/home) import from here |

### Route map (`app/api/products/**` — thin handlers)

| Endpoint | Delegates to |
|---|---|
| `GET /api/products` | `queries.getProductListByFilters` / `getProductsByIds` (cache key `buildProductListCacheKey`) |
| `GET /api/products/[slug]` | `detail.getProductDetailData` |
| `GET /api/products/[slug]/configurator` | `configurator.getConfiguratorData` |
| `GET /api/products/[slug]/gift` | direct Supabase (small; stays in route) |
| `GET /api/products/[slug]/reviews`, `.../purchase-check` | direct Supabase — **review domain, not yet migrated** |
| `GET /api/products/noteworthy` | `ssr.getNoteworthyProducts` |
| `GET /api/products/quick-pick` | `ssr.getQuickPickData` |
| `GET /api/products/sale` | `sale.getSaleProducts` |
| `GET /api/products/search` | direct Supabase + `fetchKitSupplements` |

## Domain facts that bite

- **`product_type`: `standard` | `kit` | `component` | `gift`.**
  - `standard` = standalone product; `component` = a kit part (never sold alone);
    `gift` = promo giveaway.
  - **Kit = parent product + `product_components` rows**, each linking a
    `component_product_id` (a `component`-type product). Kit stock is *not* on
    the parent: availability comes from the selected child **variants**
    (`product_variants.stock_quantity`). Parent `products.stock_quantity` is
    NULL for kits.
  - Component groups share a `component_group` label; several components can
    pour their variants into one group. `is_required`, `max_quantity`, and the
    `component_variant_rules` table (condition variant → allowed variants)
    drive the configurator.
- **Naming overlap (known debt):** `Product`/`ProductVariant` in `types.ts`
  (cart-facing, optional fields) vs `ShopVariant*`/`ProductListItem`
  (server rows) are near-duplicates; merge is a follow-up. `ssr.getProductDetail`
  and `detail.getProductDetailData` are twin loaders — the SSR one also bundles
  configurator groups/rules for the server page; unify only with care.
- **Stock authority is server-side.** Client hooks only *pre-check*; the cart
  service and order submission re-validate variants (see
  `modules/cart/server/service.ts` + `server/availability.ts`).

## Cookbook (common tasks)

- **Add a shop filter/sort:** extend `queries.getProductListByFilters` +
  `GetProductListParams`, surface it through `buildShopUrl`/`Filters`
  (`client/shop-infinite.ts`), and read it in the page's `searchParams`.
- **Change the product-detail payload:** edit `server/detail.ts` (route) and
  keep `server/ssr.ts#getProductDetail` in sync if the server page needs it.
  Bump the Redis `CACHE_VERSION` (lib/redis/cache.ts) or TTL when shape changes.
- **Add a configurator rule type:** extend `ComponentVariantRule` in
  `types.ts`, `server/configurator.ts`, and the consumers
  (`useProductViewData`, `ProductConfigurator`, `useQuickPickDrawer`).
- **New detail-page section:** new component in `ui/product/`, compose it in
  `ProductView.tsx`.
- **Reuse a card outside products** (e.g. home): import
  `@/modules/products/ui/product/ProductCard` — never copy it.

## Tests

- `server/queries.test.ts` — pure shaping helpers (`descriptionToExcerpt`).
- `ui/product/product-badges.test.ts` — badge logic.
- Full flow is covered by type-check + build (server/client boundary) + the
  e2e suite; the live product routes must be exercised against a seeded DB.
