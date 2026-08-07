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
- Core types live in `src/lib/data.ts` (`Product`, `ShopProduct`, `CartItem`, `ShippingDetails`, etc.)
- DB types are auto-generated in `src/lib/supabase/database.types.ts` — do not edit manually

### Components

- Interactive components use `"use client"` directive
- Overlays/modals use the Drawer pattern (local `drawerOpen` state + DaisyUI drawer)
- Use `<Icon>` (`src/components/ui/Icon.tsx`) for icons — wraps Material Symbols
- Always include skeleton loaders for async content
- Currency: use `formatVND()` from `src/lib/currency.ts`

### Auth

- Use `useAuth()` hook (from `AuthProvider`) in client components for `user`, `profile`, `session`
- `profile` is the extended user record (`AppUser`) fetched from `/api/user/profile`
- Call `refreshProfile()` after mutations that update profile data

### Cart

- All cart mutations go through `useCartStore` (Zustand)
- `StoreHydrator` (`src/components/ui/StoreHydrator.tsx`) must be rendered once to rehydrate from localStorage — already in root layout

## Pitfalls

- Do **not** use the admin client in client components or expose the service role key to the browser
- DaisyUI theme name is `giraffelab` — custom CSS variables (`--on-surface`, `--surface-container`, etc.) are defined in `src/app/globals.css`
- Shipping/tax constants are in `src/lib/data.ts` (standard $0, express $15, `TAX_RATE = 5.17%`)
- Next.js Image requires remote domains to be whitelisted in `apps/web/next.config.js`
