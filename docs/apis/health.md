# Health API

Source: `apps/web/src/app/api/health/route.ts`

---

## GET /api/health

Checks Supabase connectivity — verifies the auth service and all core tables are reachable. Useful for deployment smoke tests.

### Response `200`

```ts
{
  auth: { ok: boolean; error?: string };
  users: { ok: boolean; error?: string };
  categories: { ok: boolean; error?: string };
  products: { ok: boolean; error?: string };
  // ... one entry per table
}
```

No auth required. Not intended to be called from application UI.
