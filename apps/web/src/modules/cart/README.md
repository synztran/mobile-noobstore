# Module: cart

> Second domain migrated to the module layout (after `products`). Every domain
> module (`src/modules/<domain>/`) carries a README like this one — see
> `docs/module-readme.template.md` for the blank template.

**Purpose:** everything that builds, persists, prices, or renders the **shopping
cart** — the `cart_items` rows (standard/variant lines + kit parent/child
pairs), the stock/max-availability rules behind every add/update, the zustand
cart store that mirrors the server cart for instant UI, the drawer UI, the
fly-to-cart animation, and the root hydrator that syncs store ⇄ server.

**Owns the DB tables:** `carts`, `cart_items` (writes). It *reads* `products`
and `product_variants` (for row shaping + stock — see the products module for
their schema) and the `kit_component_variants` view (child-row
`component_group` labels). The stale-cart reminder also inserts
`user_notifications` and reads `push_subscriptions`.

**Out of scope here:** checkout/order creation lives in `src/store/index.ts`
(`useCheckoutStore`) + `app/(main)/checkout/*` + `app/api/checkout/*` until the
checkout module pass — those files import cart types through the `@/lib/data`
re-exports, which disappear when checkout gets its own pass.

## Layout

```
modules/cart/
  types.ts          contract types — single home, importable by every layer
  server/           server-only (import "server-only"); Supabase cart CRUD + stock rules
    service.ts          cart/items CRUD + getOrCreateCart + stock errors (was lib/cart-service.ts)
    availability.ts     deep module: PURE rules (assertQuantityAvailable) + Supabase
                        snapshot adapter (loadAvailabilitySnapshot)
    reminders.ts        sendStaleCartReminder — stale-cart push notification (extracted from GET /api/cart)
    service.test.ts / availability.test.ts
  client/           client-only behavior
    react-query/       TanStack Query hooks + query keys
      query-keys.ts      cartQueryKeys factory (merged into appQueryKeys)
      queries.ts         useCartQuery — fetches /api/cart and maps response into the store
      mutations.ts       useAddCartItem / useUpdateCartItem / useRemoveCartItem / useClearCart
    hooks/             Zustand stores and local client hooks
      useCartStore.ts    persisted Zustand cart store — was store/index.ts
      useFlyToCart.ts    useFlyToCartStore — animation state
  ui/               components
    CartDrawer.tsx      mobile bottom-sheet drawer (dynamic-imported in (main)/layout.tsx)
    DesktopCartDrawer.tsx  desktop right-side drawer (built in modules/desktop, shares useCartDrawerState)
    useCartDrawerState.ts  shared drawer state/logic (quantity, remove/clear confirm, checkout)
    CartContent.tsx     drawer body: list + empty-state
    CartItemRow.tsx     one line (+ its component pills)
    FlyToCart.tsx       flying-image overlay (rendered once in app/layout.tsx)
    CartHydrator.tsx    null renderer: runs useCartQuery + store rehydrate (rendered in (main)/layout.tsx)
  tests/
    client/useCartStore.test.ts
    server/service.test.ts / availability.test.ts
```

## Rules that keep this clean

1. **API routes are thin.** `app/api/cart/**/route.ts` do auth + param
   validation only → call a `server/` function → respond. No DB logic, no
   shaping, **no type exports** (types come from `types.ts`).
2. **Client components never touch Supabase** — react-query hooks in `client/`
   fetch the API routes; the zustand store is only ever written through
   `useCartQuery`/mutations or local user actions.
3. **Never import `server/` from a hook/component.** The `server-only` import
   turns that mistake into a build error.
4. **The availability rules are pure.** `availability.ts` exports
   `assertQuantityAvailable(snapshot, qty)` with zero I/O; `service.ts` loads a
   snapshot via `loadAvailabilitySnapshot` (the adapter at an internal seam)
   and feeds it in. Checkout's future re-validation can share the rule shape
   without importing Supabase code.
5. **Cart product types come from the products module** (`Product`,
   `ProductVariant`, `SelectedComponent`, `PreOrderConfig` in
   `@/modules/products/types`) — never redefine them. Unmigrated consumers
   still get them via `@/lib/data` re-exports.
6. **Store locality.** `useCartStore` lives here, not in `src/store`; the
   remaining `src/store/index.ts` only hosts `useCheckoutStore` until the
   checkout pass.

## Data flow

```
TopNav / ProductCard / useQuickPickDrawer / …
        │  add / updateQty / remove (optimistic zustand)
        ▼
useCartStore (client/useCartStore.ts)  ◄── setCart ──┐
        │                                              │
        ▼ useCartQuery (client/queries.ts)             │
   fetch GET /api/cart  ─► app/api/cart (thin)         │ refetch on mutation
        │                 └► server/service.getCartItems ──► Supabase
        ▼
CartDrawer / CartContent / CartItemRow  (ui/) — the store is the single source
```

Mutations instead: hook → `fetch /api/cart/items…` → route validates auth
(+ access check on `/items/[id]`) → `server/service.*` → availability snapshot
→ write → react-query invalidates → `useCartQuery` refetches → `setCart`.

## API surface map

### Public contract types (`types.ts`)

| Group | Symbols |
|---|---|
| Client item | `CartItem`, `CartGift` |
| Server wire | `CartApiItem` (row + joined product/variant/children), `UpsertCartInput` |
| HTTP contract | `AddCartItemRequest` (= `UpsertCartInput`), `AddCartItemResponse` |

### Server (`server/`)

| Symbol | File | What it does |
|---|---|---|
| `getOrCreateCart(supabase, {userId})` | `service.ts` | Find active cart or insert one (retries on 23505) |
| `getCartItems(supabase, cartId)` | `service.ts` | All rows for the cart, split parent/child, joined product/variant + `component_group` from `kit_component_variants` → `CartApiItem[]` |
| `upsertCartItem(supabase, cartId, input)` | `service.ts` | Add-or-bump a line. Kits match an existing parent by exact component variant set; standard/variant lines by `(product_id, variant_id, parent NULL)`. Availability + `max_quantity` enforced before every write |
| `updateCartItemQuantity` | `service.ts` | Set a line's quantity (re-validates availability, incl. kit children) |
| `removeCartItem` | `service.ts` | Deletes children first, then the row |
| `clearCart` | `service.ts` | Delete all rows of a cart |
| `StockExceededError` (`available`) / `MaxLimitExceededError` (`max`) | `service.ts` | Thrown by the service, mapped to `409` by the routes |
| `assertQuantityAvailable(snapshot, targetQty)` | `availability.ts` | **Pure** rule engine (see domain facts) |
| `loadAvailabilitySnapshot(supabase, params)` | `availability.ts` | Adapter: product row + variant stock + committed usage by *other* lines → `AvailabilitySnapshot` |
| `sendStaleCartReminder(supabase, cartId, userId)` | `reminders.ts` | Fire-and-forget push after GET when cart is 12h+ stale (1/day cap); skips empty carts (count < 1) |

### Client (`client/`)

| Symbol | What it does |
|---|---|
| `useCartQuery` | Fetch `/api/cart`, map `CartApiItem[]` → `CartItem[]`, `useCartStore.getState().setCart(...)`; exposes `isFetching` to the TopNav icon |
| `useAddCartItem` / `useUpdateCartItem` / `useRemoveCartItem` / `useClearCart` | Mutations → `/api/cart/items…`; invalidate/refetch `cartQueryKeys.all` on success (remove awaits the refetch so rows re-enable only after fresh data) |
| `useCartStore` | Optimistic source of truth for the UI: items, cartId, isOpen, isHydrated, cartFetching + actions. Persisted (`noobstore-cart`), `skipHydration` — rehydrated by `CartHydrator` |
| `useFlyToCartStore` | `{isAnimating, imageUrl, startRect}` consumed by `ui/FlyToCart` |
| `cartQueryKeys` | `cart.all` — merged into `appQueryKeys` in `src/lib/react-query/root.ts` |

### UI

| Component | Job |
|---|---|
| `CartDrawer` | Drawer shell + per-item handlers (mutations, analytics, delete-confirm, checkout navigation) |
| `CartContent` | Empty state (suggestion chips from `@/constants/cart`) or the list |
| `CartItemRow` | One line: image, name, variant/component pills, qty stepper, price |
| `FlyToCart` | Image flies from the tapped card to the `[data-cart-icon]` in TopNav |
| `CartHydrator` | Mounted once in `(main)/layout.tsx`; drives `useCartQuery` + `persist.rehydrate()` |

### Route map (`app/api/cart/**` — thin handlers)

| Endpoint | Delegates to |
|---|---|
| `GET /api/cart` | `service.getCartItems` (+ `reminders.sendStaleCartReminder`); returns `{cart_id, items}` or empty for anonymous/absent cart |
| `DELETE /api/cart?cart_id=` | `service.clearCart` |
| `POST /api/cart/items` | `service.getOrCreateCart` + `service.upsertCartItem`; 409 with `{available}`/`{max}` on stock/max errors |
| `PATCH /api/cart/items/[id]` | authz check (item's cart belongs to caller) + `service.updateCartItemQuantity` |
| `DELETE /api/cart/items/[id]` | authz check + `service.removeCartItem` |

## Domain facts that bite

- **`cart_items` is hierarchical for kits.** A kit line = one **parent** row
  (`variant_id NULL`, `quantity` = line qty, `parent_cart_item_id NULL`) +
  one **child** row per selected component variant (`quantity 1` marks, linked
  by `parent_cart_item_id`). A standard product with a variant is a *single*
  row carrying `variant_id`; the same `product_id` can legitimately appear in
  several rows (parent + children; or two variant lines) — always key lines by
  `cart_items.id` (the `item_id` of the API), never by `product_id`.
- **Stock is checked per resource, not per row.** For kits, `products.stock_quantity`
  is NULL — real capacity lives on each selected `product_variants.stock_quantity`,
  where one kit unit consumes one unit of *every* selected variant, and a
  variant used in two groups counts twice (`target × occurrences`). `committed`
  in the snapshot is what *other* lines already hold, so updates exclude the
  line being changed. `max_quantity` (per customer per product) caps every
  shape on increase; decreasing is always allowed.
- **Client store is optimistic, server is authoritative.** The store pre-checks
  against `product.stock_quantity` only (standard shape); the server
  re-validates every mutation with the full kit/variant/max rules above and
  answers `409 {available|max}` — the drawer toasts the error and the refetch
  reconciles the real state.
- **Hydration quirk:** persisted `isOpen: true` can auto-reopen the drawer on
  load (pre-existing, tracked separately); the store `partialize`s only
  `items`/`cartId`, so closing state isn't persisted.
- **Legacy re-exports:** `CartItem` is re-exported by `@/lib/data` for
  unmigrated consumers (`components/checkout/*`, `src/store`'s checkout store,
  orders). `components/checkout/OrderItemsList` still imports it from there —
  that import moves to this module when checkout gets its own pass.

## Cookbook (common tasks)

- **Change what a cart GET returns:** edit `service.getCartItems` + the
  `CartApiItem` shape in `types.ts`; `client/queries.ts#transformToCartItem`
  decides how the store sees it.
- **Add a stock rule** (e.g. a per-variant cap): extend `AvailabilitySnapshot`
  + `assertQuantityAvailable` in `server/availability.ts` (pure — covered by
  `availability.test.ts`), then the snapshot loader.
- **New cart action** (e.g. "move to wishlist"): add `service.ts` fn → thin
  route → `client/mutations.ts` hook → wire in `ui/CartDrawer.tsx`.
- **Touch the drawer from anywhere:** call `useCartStore.getState().openCart()`
  (or the hook) — the module import is
  `@/modules/cart/client/useCartStore`.

## Tests

- `tests/server/service.test.ts` — mocked-Supabase coverage of the "kit bypass" bug:
  kit upserts never exceed variant stock across the cart (global semantics) nor
  the product `max_quantity`; update path enforces the line's own variant.
- `tests/server/availability.test.ts` — the pure rule engine: standard/variant/kit
  shapes, multiplicity, committed usage, decreases always allowed.
- `tests/client/useCartStore.test.ts` — store logic (merge same kit config,
  add/remove/updateQty/totals).
- Full flow is covered by type-check + build (server/client boundary) + e2e
  against a seeded DB.
