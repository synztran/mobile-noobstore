# Services API

Source: `apps/web/src/app/api/services/route.ts`

> **Note:** `/api/fees` is deprecated and returns `410`. Use this endpoint instead.

---

## GET /api/services

Returns all available add-on services with their base prices. No auth required.

### Response `200`

```ts
Array<{
  id: string;
  name: string;
  base_price: number;
}>
```

### Example

```ts
const res = await fetch("/api/services");
const services = await res.json();
```

Pass selected `id` values as `service_ids` in the [`/api/checkout/submit`](./checkout.md) request body.
