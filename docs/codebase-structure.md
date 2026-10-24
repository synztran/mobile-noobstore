# Codebase structure — feature modules

> Reusable template. The **products** domain in `apps/web/src/modules/products/`
> is the reference implementation; **cart** (`apps/web/src/modules/cart/`) is the
> second migrated domain (client-driven, zustand store + react-query),
> **user** (`apps/web/src/modules/user/`) is the third (auth + profile +
> wishlist), and **gacha** (`apps/web/src/modules/gacha/`) is the fourth
> (machine UI + token economy + weighted draws + missions). Use this doc when structuring a new domain (order, home, checkout,
> …) or when starting
> a new Next.js project.

## The one rule: one folder per domain, three layers inside

```
src/modules/<domain>/
  types.ts        # contract types — importable from every layer, imported by nothing else
  server/         # Supabase reads, row shaping, SSR helpers  (import "server-only")
  client/         # react-query hooks, query keys, non-UI state logic
  ui/             # components (split by surface: detail / list / …)
```

Every domain owns its types, its data access, its hooks, and its UI in one
place. Delete the folder and the whole feature vanishes with it — nothing else
in the app should reach *into* another domain's module.

**Every module carries a README** (`src/modules/<domain>/README.md`) that is
the quick-re-search entry point: purpose, layout, layer rules, data flow, a
grep-able inventory of server/client exports, the route map, domain facts that
bite, a cookbook, and tests. Template: `docs/module-readme.template.md`.
Reference example: `apps/web/src/modules/products/README.md`. Write the README
in the same pass you migrate the domain — the migration is when the knowledge
is fresh and all the symbols are visible.

## Why the current layout was messy (the problems this fixes)

1. **Types exported from API route files.** `ShopProduct`/`ProductDetail` used
   to be exported from `app/api/products/**/route.ts` and imported by 40+
   components, hooks, and libs. A route file is an HTTP adapter — it must never
   be a type hub. Renaming a route broke 30 files.
2. **No visible server/client boundary.** Nothing stopped a client hook from
   importing server logic; several `*server.ts` files duplicated the same
   shaping as their API routes.
3. **Layer names were roles, not places.** `product-query-service.ts`,
   `products-server.ts`, route handlers, and react-query hooks all looked the
   same from a distance; a newcomer couldn't tell what ran where.
4. **Logic duplicated across tiers.** Kit stock math existed in server code,
   the API route, and a client hook (weaker copy). When the rule changed it was
   updated in some copies and forgotten in others.

## Layer contracts

| You are writing… | Put it in | Import marker | Can it call… |
|---|---|---|---|
| Supabase query + row shaping | `server/queries.ts` | `import "server-only"` | `server/` siblings |
| SSR helper for server components | `server/ssr.ts` | `import "server-only"` | `server/*`, types |
| HTTP endpoint | `app/api/<domain>/**/route.ts` | `export const dynamic = "force-dynamic"` (when needed) | `server/*`, types |
| react-query hook / query keys | `client/*.ts` | `"use client"` | `client/`, types |
| Non-UI client state hook | `client/*.ts` | `"use client"` | `client/`, types |
| Component (leaf or page section) | `ui/<surface>/*.tsx` | `"use client"` only when interactive | `client/`, types, `components/ui/*` |

Decision shortcuts:

- **It talks to Supabase?** → `server/`. Never from a hook or component.
- **It fetches on the client?** → a react-query hook in `client/`, hitting `/api/…`.
- **It shapes data for a page you render on the server?** → `server/ssr.ts`, called by the page directly.
- **It's a type?** → `types.ts`. Route files import it; they never export domain types.
- **It renders pixels?** → `ui/`.

## Data flow

```
Server Component / page
        │  calls directly (no HTTP)
        ▼
modules/<domain>/server/ssr.ts ──► modules/<domain>/server/queries.ts ──► Supabase

Client Component
        │  useQuery/useMutation
        ▼
modules/<domain>/client/queries.ts ──fetch──► app/api/<domain>/**/route.ts
                                                     │  thin handler only
                                                     ▼
                                        modules/<domain>/server/* ──► Supabase
```

Server and client sides may share the same `queries.ts` underneath; the API
route is just the transport seam for the browser, so it stays as thin as
possible (parse params → call → respond).

## Hardening

- Every `server/` file starts with `import "server-only"` — Next.js then fails
  the build if anything client-side pulls it in.
  - Tests: `server-only` throws outside RSC, so `vitest.config` aliases it to a
    local empty stub (see `apps/web/vitest.config.mts`).
- Types stay **type-only** across the client boundary (`import type`), so no
  runtime code is shared unless you want it.
- `client/` and `ui/` files used only by client components carry `"use client"`.

## Migration checklist (for the next domain)

1. **Types** — create `modules/<domain>/types.ts`; repoint every importer that
   reached into `app/api/<domain>/**/route.ts` or `src/lib/data.ts`; strip type
   exports from route files. Gate: type-check.
2. **Server** — move `lib/*-server.ts` / `-query-service.ts` into `server/`,
   add `server-only`, fix imports. Gate: type-check + unit tests.
3. **Client** — move react-query hooks + query keys + state hooks into
   `client/`, update the `react-query/root.ts` aggregator. Gate: type-check.
4. **UI** — move `components/<domain>` trees into `ui/`. Import sweeps are
   mechanical (prefix swap); watch for *relative* cross-directory imports,
   which grep-based sweeps miss. Gate: type-check.
5. **Thin routes** — extract any remaining DB/shaping from `app/api/<domain>/**`
   into `server/`; routes become parse → call → respond. Gate: type-check.
6. **README** — write `modules/<domain>/README.md` from
   `docs/module-readme.template.md` while the knowledge is fresh.
7. **Verify** — `yarn type-check`, `yarn test:unit`, then `yarn build` (catches
   server/client boundary violations). Spot-check the live pages.

Mechanical-import tips (learned the hard way):

- `perl -pi` string replaces beat `sed` for paths with `(`, `)`, `[`, `]` —
  use `\Q…\E` to quote the literal, and **do not include surrounding quote
  characters inside the match** (they arrive as `\"` and silently never match).
- Moves should be pure renames; no logic changes in the same pass.
- **Tailwind content globs must cover `src/modules`** (or `./src/**/*`).
  Tailwind only generates classes it scans — a moved UI file under a
  non-scanned dir silently loses every class unique to it (sheets float
  mid-page, `aspect-[1/1]` boxes collapse). `yarn build` will NOT catch it;
  verify by grepping the built CSS for a class unique to a moved file.
- `server-only` is an extra dependency (1 KiB) — add it to the app that owns
  `modules/` and stub it in the test runner.
