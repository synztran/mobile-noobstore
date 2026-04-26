# User API

Source files:
- `apps/web/src/app/api/user/profile/route.ts`
- `apps/web/src/app/api/user/orders/route.ts`
- `apps/web/src/app/api/user/orders/[id]/route.ts`

All routes require authentication. Returns `401` if no session.

---

## GET /api/user/profile

Returns the authenticated user's profile record.

### Response `200`

```ts
{
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone_number: string | null;
  role: string;
  created_at: string;
}
```

### Errors

| Status | Reason |
|--------|--------|
| `401` | Not authenticated |
| `404` | User record not found |

---

## PATCH /api/user/profile

Updates the authenticated user's profile. Only `first_name`, `last_name`, and `phone_number` are accepted — all other fields are stripped.

### Request Body

```ts
{
  first_name?: string;
  last_name?: string;
  phone_number?: string;
}
```

### Response `200`

Returns the updated profile fields.

### After updating

Always call `refreshProfile()` from `useAuth()` so the in-memory `AppUser` stays in sync:

```ts
const { refreshProfile } = useAuth();
await fetch("/api/user/profile", { method: "PATCH", body: ... });
await refreshProfile();
```

---

## GET /api/user/orders

Returns a paginated list of the authenticated user's orders.

### Query Parameters

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | number | `1` | Page number (20 orders per page) |
| `q` | string | — | Search by order number |

### Response `200`

```ts
import type { OrdersResponse } from "@/app/api/user/orders/route";
```

```ts
interface OrdersResponse {
  orders: OrderSummary[];
  total: number;
}

interface OrderSummary {
  id: string;
  order_number: string;
  status: string;
  total_price: number;
  item_count: number;
}
```

### Example

```ts
const res = await fetch(`/api/user/orders?page=1`);
const { orders, total }: OrdersResponse = await res.json();
```

---

## GET /api/user/orders/[id]

Returns full detail for a single order. Only accessible by the order's owner.

### Path Parameter

| Param | Type | Description |
|-------|------|-------------|
| `id` | string (UUID) | Order ID |

### Response `200`

```ts
import type { OrderDetail } from "@/app/api/user/orders/[id]/route";
```

```ts
interface OrderDetail {
  id: string;
  order_number: string;
  status: string;
  total_price: number;
  items: OrderItemDetail[];
}

interface OrderItemDetail {
  id: string;
  product_id: string | null;
  product_name: string;
  unit_price: number;
  quantity: number;
}
```

### Errors

| Status | Reason |
|--------|--------|
| `401` | Not authenticated |
| `404` | Order not found or belongs to another user |
