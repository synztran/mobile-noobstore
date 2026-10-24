# Agent Instructions — mobile-noobstore

A mobile-first e-commerce storefront built with Next.js 15, Supabase, and a Turborepo monorepo.

## Commands

```bash
yarn dev          # Start all apps (Turbo)
yarn build        # Build all apps
yarn lint         # ESLint across workspace (broken repo-wide — next lint deprecated in Next 15; non-TTY prompt)
yarn type-check   # TypeScript check (tsc --noEmit)
yarn test:unit    # Vitest unit tests (apps/web)
yarn test:e2e     # Playwright end-to-end (needs dev servers + seeded creds)
yarn check:admin-auth  # Guard: admin API must stay middleware-protected
```

Run these from the workspace root. The only app currently is `apps/web`.

## Architecture

- **Framework**: Next.js 15 App Router with Server Components
- **Database/Auth**: Supabase (PostgreSQL + RLS + SSR Auth)
- **Styling**: Tailwind CSS + DaisyUI theme `giraffelab`
- **State**: Zustand with `persist` middleware (single `useCartStore`)
- **Package manager**: Yarn 4.3.1 (workspaces: `apps/*`, `packages/*`)

### Route Groups

| Group | Path | Purpose |
|---|---|---|
| `(auth)` | `/login`, `/register` | Public auth pages |
| `(main)` | `/`, `/shop`, `/checkout`, `/profile` | Protected/main app |

`apps/web/src/middleware.ts` guards `/checkout` (requires auth) and redirects authed users away from auth pages.

## Key Conventions

### Package changes — approval required

- Before adding a new package or upgrading an existing package, ask the owner for explicit approval and wait before changing manifests, lockfiles, or installing it.
- In the approval request, write each affected package name in **bold** and explain the reason, proposed version, and compatibility risks.

### Supabase Clients — use the right one

| Client | File | When to use |
|---|---|---|
| Browser | `src/lib/supabase/client.ts` | Client components |
| Server (SSR) | `src/lib/supabase/server.ts` | Server components, API routes |
| Admin | `src/lib/supabase/admin.ts` | Server-only, bypasses RLS — use sparingly |

### Data Fetching

- **Server Components**: call Supabase directly via `server.ts` client
- **Client Components**: fetch via API routes (`/api/…`)
- Add `export const dynamic = "force-dynamic"` to API routes that must not be cached
- DB types are auto-generated in `src/lib/supabase/database.types.ts` — do not edit manually

### Domain structure (`src/modules/<domain>/`)

The **products**, **cart**, **user**, and **gacha** domains have been migrated
to this layout; products is the reference template for future domains (order,
home, checkout, … — see `docs/codebase-structure.md` for the full guide).

Every module carries a `README.md` at its root (`src/modules/products/README.md`
is the reference example; `docs/module-readme.template.md` is the blank
template). Read the module README before editing inside a module — it maps the
layout, the server/client exports, the API routes, and the domain pitfalls.

| Layer | Location | Runs on | Contents |
|---|---|---|---|
| Contract types | `modules/products/types.ts` | shared | Product/ShopProduct/ProductDetail/Configurator types — the single source; **never export product types from API route files** |
| Server logic | `modules/products/server/` | server only | Supabase reads + row shaping (`queries.ts`), SSR helpers for server components (`ssr.ts`), sale/flash-sale/detail/configurator loaders. Every file starts with `import "server-only"` |
| Client logic | `modules/products/client/` | client only | react-query hooks + query keys (`queries.ts`, `shop-infinite.ts`, `query-keys.ts`) and non-UI state hooks |
| UI components | `modules/products/ui/` | client/server | `product/`, `shop/`, `sale/`, `search/`, `recently-viewed/` split by surface |

**Data flow rules:**

- A **Server Component / page** calls `modules/products/server/ssr.ts` directly — no HTTP hop.
- A **Client Component** calls a react-query hook in `modules/products/client/`, which fetches `app/api/products/**`; the route is a *thin handler* that delegates to `modules/products/server/`.
- API endpoints always stay under `app/api/<domain>/**` (Next.js requires it) but contain no DB/shaping logic.
- Cross-cutting types for **unmigrated** domains are re-exported from `src/lib/data.ts` for now (`Product`, `ProductVariant`, `CartItem`, … — defined in the products/cart modules). These re-exports disappear when checkout/orders get their own passes.
- The **checkout** store (`useCheckoutStore`) still lives in `src/store/index.ts` until the checkout pass — the cart store moved out into `modules/cart/client/`.

**Not yet migrated** (still in `src/lib/*`, `src/hooks/*`, `src/components/*`, `src/lib/react-query/*`): orders, home, checkout, community, services, etc. Move them into `modules/<domain>/` following the products template when you touch them.

### Components

- Interactive components use `"use client"` directive
- Overlays/modals use the Drawer pattern (local `drawerOpen` state + DaisyUI drawer)
- Use `<Icon>` (`src/components/ui/Icon.tsx`) for icons — wraps **lucide-react** components
- **Only use icons from lucide-react** — do not add new Material Symbols, Heroicons, or any other icon library. If a needed icon is not yet in the `ICON_MAP` in `Icon.tsx`, add it there (import from `lucide-react` + `MANUAL_MAP` entry) before using it.
- Always include skeleton loaders for async content
- Currency: use `formatVND()` from `src/lib/currency.ts`
- Linking: use `next/link` for all internal navigation; use `<a>` only when `target="_blank"` is required (external links). `mailto:`/`tel:` protocol links may also stay `<a>`

### Cart

- The cart module is `src/modules/cart/` — read its `README.md` before editing. All cart state flows through `useCartStore` (`modules/cart/client/useCartStore.ts`, Zustand)
- `CartHydrator` (`modules/cart/ui/CartHydrator.tsx`) is rendered once in `app/(main)/layout.tsx` and drives `useCartQuery` + store rehydrate
- `StoreHydrator` (`src/components/ui/StoreHydrator.tsx`) rehydrates the checkout store only — it stays in the root layout

### Auth / User

- The user module is `src/modules/user/` — read its `README.md` before editing. It owns auth (sign-in/sign-up), the `users` profile + `user_addresses`, and the wishlist
- `AuthProvider`/`useAuth()` live in `modules/user/client/AuthProvider.tsx` (mounted once in the root layout). `profile` is the extended `AppUser` fetched from `/api/user/profile`; call `refreshProfile()` after profile mutations
- `safeRedirect` is in `modules/user/redirect.ts` (isomorphic) — middleware and `/auth/callback` import it from there

### Gacha

- The gacha module is `src/modules/gacha/` — read its `README.md` before editing. It owns the `/gacha` machine UI, token economy, weighted draws, missions, and winner ticker
- Server logic lives in `modules/gacha/server/` (`event`, `draw`, `history`, `winners`, `missions` — all `import "server-only"`); the six `app/api/gacha/**` routes are thin handlers
- `triggerMissionClient` (`modules/gacha/client/missions.ts`) is browser-only; `triggerMissionServer` (`modules/gacha/server/missions.ts`) is server-only and is also imported by the checkout route
- The draw money path (`draw.ts`) calls `earnPointsFromGachaReward` from `@/lib/points/service` — points gets its own pass later

## Pitfalls

- Do **not** use the admin client in client components or expose the service role key to the browser
- DaisyUI theme name is `giraffelab` — custom CSS variables (`--on-surface`, `--surface-container`, etc.) are defined in `src/app/globals.css`
- Shipping/tax constants are in `src/lib/data.ts` (standard $0, express $15, `TAX_RATE = 5.17%`)
- Next.js Image requires remote domains to be whitelisted in `apps/web/next.config.js`
