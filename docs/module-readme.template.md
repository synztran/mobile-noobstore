# Module: <domain>

> **Template.** Copy this file to `src/modules/<domain>/README.md` when you
> migrate or create a domain, then fill in every section with REAL content
> mined from the code (symbol names, route paths, table names). The goal:
> someone (or an AI) can re-orient from this file alone, and `grep`-able
> symbols connect prose to code. Reference example:
> `apps/web/src/modules/products/README.md`.

**Purpose:** one paragraph — what the domain owns, and which DB tables / page
surfaces it covers.

**Owns the DB tables:** `…`. (Things that *write* to these tables but live in
other domains should be listed here too, so no one is surprised.)

## Layout

```
modules/<domain>/
  types.ts       contract types — single source, imported by every layer
  server/        server-only (import "server-only")
    queries.ts       low-level DB reads + row shaping
    ssr.ts           React.cache() helpers for Server Components / pages
    …                feature loaders (one file per surface/endpoint)
  client/        client-only ("use client")
    query-keys.ts    key factories (merged into appQueryKeys in src/lib/react-query/root.ts)
    queries.ts       react-query hooks that fetch app/api/<domain>/**
    …                non-UI state hooks; hooks coupled to one component live in ui/
  ui/            components, split by surface
```

## Rules that keep this clean

1. API routes are thin (parse → call `server/` → respond), no DB/shaping, no
   type exports from route files.
2. Server Components call `server/ssr.ts` directly — never over HTTP.
3. Client Components never touch Supabase — react-query hooks in `client/`.
4. Never import `server/` from client code — `server-only` enforces it.
5. …domain-specific rules…

## Data flow

```
Server page  <paths>
        │  direct call
        ▼
server/ssr.ts ──► server/queries.ts ──► Supabase
                        ▲
client hooks  fetch ──► app/api/<domain>/**  (thin)  ──► server/*
```

## API surface map

### Public contract types (`types.ts`)
| Group | Symbols |
|---|---|
| … | `…` |

### Server (`server/`)
| Symbol | File | What it does |
|---|---|---|

### Client (`client/`)
| Symbol | What it does |
|---|---|

### UI surfaces
| Surface | Components |
|---|---|

### Route map (`app/api/<domain>/**`)
| Endpoint | Delegates to |
|---|---|

## Domain facts that bite

- Data-model invariants, denormalized columns, who *else* reads/writes these
  tables, cross-domain callbacks, caching keys/TTLs.

## Cookbook (common tasks)

- Step-by-step recipes for the 3–5 most frequent changes in this domain.

## Tests

- What is unit-tested and where; what needs e2e / a seeded DB.
