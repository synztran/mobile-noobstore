# Checkout API

Source: `apps/web/src/app/api/checkout/submit/route.ts`

---

## POST /api/checkout/submit

Creates an order from the current cart contents. Auth is optional — guest checkout is supported.

### Request Body

```ts
import type { SubmitOrderRequest } from "@/app/api/checkout/submit/route";
```

```ts
interface SubmitOrderRequest {
  order_id: string;       // caller-generated idempotency ID (use nanoid)
  total_price: number;
  items: {
    id: string;           // caller-generated item ID
    product_id: string;
    product_name: string;
    unit_price: number;
    quantity: number;
  }[];
  service_ids?: string[]; // optional add-on service IDs from /api/services
}
```

### Response `200`

```ts
import type { SubmitOrderResponse } from "@/app/api/checkout/submit/route";
```

```ts
interface SubmitOrderResponse {
  order_id: string;
  order_number: string; // human-readable, e.g. "ORD-LXYZ123-AB4C"
  status: string;       // "pending"
}
```

### Errors

| Status | Reason |
|--------|--------|
| `400` | Missing `order_id` or empty `items` |
| `500` | DB insert failure |

### Pricing Constants

Always compute `total_price` on the client using values from `src/lib/data.ts`:

| Constant | Value |
|----------|-------|
| Standard shipping | $0 |
| Express shipping | $15 |
| `TAX_RATE` | 5.17% |

### Example

```ts
import { nanoid } from "nanoid";
import type { SubmitOrderRequest, SubmitOrderResponse } from "@/app/api/checkout/submit/route";

const body: SubmitOrderRequest = {
  order_id: nanoid(),
  total_price: subtotal + shippingCost + tax,
  items: cartItems.map((item) => ({
    id: nanoid(),
    product_id: item.product.id,
    product_name: item.product.name,
    unit_price: item.variant?.effective_price ?? item.product.base_price,
    quantity: item.quantity,
  })),
  service_ids: selectedServiceIds,
};

const res = await fetch("/api/checkout/submit", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});
const order: SubmitOrderResponse = await res.json();
```
