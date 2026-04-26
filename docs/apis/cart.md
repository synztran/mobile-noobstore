# Cart API

Source: `apps/web/src/app/api/cart/add/route.ts`

---

## POST /api/cart/add

Adds a parent kit product and its selected component variants as a bundle to the cart. Auth is optional — authenticated users get a persistent cart, guests use a cookie-tracked cart.

### Request Body

```ts
import type { AddToCartRequest } from "@/app/api/cart/add/route";
```

```ts
interface AddToCartRequest {
  parent_product_id: string;      // UUID of the kit product
  selected_variant_ids: string[]; // variant UUIDs, one per component group
}
```

### Response `200`

```ts
import type { AddToCartResponse } from "@/app/api/cart/add/route";
```

```ts
interface AddToCartResponse {
  cart_id: string;
  parent_cart_item_id: string;
}
```

### Cart Behaviour

| User state | Cart resolution |
|------------|----------------|
| Authenticated | Looks up existing cart by `user_id`, creates one if none |
| Guest | Reads `noobstore-cart-id` cookie; creates a new cart if absent |

### Errors

| Status | Reason |
|--------|--------|
| `400` | Missing `parent_product_id` |
| `500` | DB insert failure |

### Example

```ts
const res = await fetch("/api/cart/add", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    parent_product_id: product.id,
    selected_variant_ids: selectedVariantIds,
  }),
});
const { cart_id, parent_cart_item_id }: AddToCartResponse = await res.json();
```

> **State:** After a successful add, always call `useCartStore` to sync local Zustand state. Do not rely solely on the API response.
