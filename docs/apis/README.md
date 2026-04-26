# API Reference

All routes live under `apps/web/src/app/api/`. Route handlers export TypeScript types — import them directly instead of redefining.

## Route Index

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | [`/api/products`](./products.md#get-apiproducts) | — | List/filter products |
| GET | [`/api/products/[slug]`](./products.md#get-apiproductsslug) | — | Single product detail |
| GET | [`/api/products/[slug]/configurator`](./products.md#get-apiproductsslugconfigurator) | — | Kit component groups |
| POST | [`/api/cart/add`](./cart.md#post-apicartadd) | optional | Add kit to cart |
| POST | [`/api/checkout/submit`](./checkout.md#post-apicheckoutsubmit) | optional | Create order |
| GET | [`/api/services`](./services.md#get-apiservices) | — | List available services |
| GET | [`/api/user/profile`](./user.md#get-apiuserprofile) | ✓ | Get profile |
| PATCH | [`/api/user/profile`](./user.md#patch-apiuserprofile) | ✓ | Update profile |
| GET | [`/api/user/orders`](./user.md#get-apiuserorders) | ✓ | List orders (paginated) |
| GET | [`/api/user/orders/[id]`](./user.md#get-apiuserordersid) | ✓ | Order detail |
| GET | [`/api/health`](./health.md) | — | DB connectivity check |
| GET | `/api/fees` | — | **Deprecated** → use `/api/services` |

## Conventions

- All routes export `const dynamic = "force-dynamic"` to bypass caching.
- Auth routes read the session from cookies via `src/lib/supabase/server.ts`.
- Public routes use `src/lib/supabase/public.ts` (anon key, no session needed).
- Errors always return `{ error: string }` with an appropriate HTTP status.
- Import types from the route file, not from `data.ts`, for API-specific shapes.
