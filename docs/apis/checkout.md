# Checkout API

Source: `apps/web/src/app/api/checkout/submit/route.ts`

---

## POST /api/checkout/submit

Creates an order from the current cart contents. **Auth is required** — the route returns `401` for anonymous callers. (Older revisions of this doc claimed guest checkout was supported; that is no longer true.)

The cart to convert is resolved server-side from the session. `cart_id` is advisory only — the route logs a warning when it disagrees with the active cart, and ignores it.

### Request Body

```ts
import type { SubmitOrderRequest } from "@/app/api/checkout/submit/route";
```

```ts
interface SubmitOrderRequest {
  cart_id?: string | null;      // advisory, see note above
  shipping_cost: number;        // see "Shipping fees" — advisory for some methods
  payment_type?: "full" | "deposit_cod";
  deposit_percentage?: number;
  shipping_method_id?: string | null;
  pickup_at?: string | null;    // required when the method is `pickup`
  delivery_address?: {
    full_name: string;
    phone_number: string;
    street_address?: string;
    apartment?: string | null;
    city?: string;
    district?: string;
    ward?: string;
    district_code?: string | null;
    ward_code?: string | null;
    postal_code?: string | null;
    notes?: string | null;
  } | null;
  items: SubmitOrderRequestItem[];
  service_ids?: string[];
  vouchers?: Array<{
    voucher_id?: string | null;
    voucher_code?: string | null;
    voucher_discount_amount?: number;
    shipping_discount_amount?: number;
    voucher_snapshot?: AppliedVoucherSummary | null;
    gift_items_snapshot?: Array<{
      product_id: string;
      variant_id: string | null;
      quantity: number;
    }> | null;
  }>;
  rank_discount?: {
    discount_amount: number;
    free_shipping: boolean;
    rank_name: string;
  };
}
```

`SubmitOrderRequestItem` covers `variant_id`, `is_pre_order` / `pre_order_config`, and configurable-product `components` — see the interface in the route for the full shape.

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
| `400` | `items are required` |
| `400` | `pickup_at is required for store pickup` |
| `401` | `Unauthorized` — no authenticated Supabase session |
| `500` | `Failed to verify product prices` |
| `500` | `Failed to save delivery details` |
| `503` | `Failed to load delivery fee` — `fees` config unreachable |

## Shipping fees

Fees are **not** in `src/lib/data.ts`. That file still exports the old `SHIPPING_COST` / `TAX_RATE` constants; they are dead code and nothing in the checkout path reads them.

The live source of truth is the single-row `fees` table, read through `getFeesConfig()` in `src/lib/fees.ts` and editable from the admin app at `/fees`. Delivery-method prices are resolved per method:

| `shipping_method_id` | Scope | Fee source | Client value trusted? |
|---|---|---|---|
| `standard` | HCMC | Distance-derived, `fees.basic_shipping_fee` / `distance_fees` | Yes (clamped to 500,000) |
| `express` | HCMC | Distance-derived, `fees.immediate_shipping_fee` / `distance_fees` | Yes (clamped to 500,000) |
| `carrier_4h` | HCMC | Unquoted — shows "Cập nhật sau" | No |
| `carrier_express` | HCMC | Unquoted — shows "Cập nhật sau" | No |
| `delivery_service` | Outside HCMC | Unquoted — shows "Cập nhật sau" | No |
| `pickup` | Anywhere | Free | No |

`carrier_4h` and `carrier_express` are **speed tiers, not carriers**. The actual carrier is assigned later in admin fulfillment (`orders.tracking_carrier_id`), and the customer link is built from `carriers.tracking_url_template` + `orders.tracking_number` — see `src/lib/tracking.ts`. Their visibility is purely geographic (HCMC); there is no price that switches a tier off.

All three courier methods (`carrier_4h`, `carrier_express`, `delivery_service`) are **unquoted**: the BE / Grab / Green SM rate depends on the parcel, so the order is created with `shipping_fee = 0` and the real amount is entered per order from admin `/orders`. That edit moves `total_price` (and `remaining_amount` on deposit orders) by the same delta, is rejected for `cancelled`/`refunded` orders, and emails the customer. An unquoted fee cannot be applied as a `deposit_cod` deposit — the preorder override still forces a deposit.

Because `shipping_fee = 0` is ambiguous, `isFeePendingShippingMethod()` and `hasUnquotedShippingFee()` in `src/lib/shipping-method.ts` combine the method with the amount to decide whether the UI shows "Cập nhật sau"; this keeps a genuinely free own-rider order from being mislabelled as pending.

A shipping discount voucher (`reward_type` `shipping_amount_off` / `shipping_percent_off` / `free_shipping`) is rejected at apply time when the selected method is quote-pending, since the fee it would discount is not known yet and the saving would resolve to 0đ. `/api/checkout/submit` re-checks this and silently drops such a voucher if a client submits one directly.

The route still writes `expected_delivery_at` for the two in-city tiers (4h and 2h) from the SLA window in `src/lib/carrier-shipping.ts`, and returns `503` rather than falling back to a client-supplied price if the distance-fee config is unreachable.

### Example

```ts
import { nanoid } from "nanoid";
import type { SubmitOrderRequest, SubmitOrderResponse } from "@/app/api/checkout/submit/route";

const body: SubmitOrderRequest = {
  shipping_cost: currentShippingCost,
  shipping_method_id: "carrier_4h",
  delivery_address: {
    full_name: "Nguyễn Văn A",
    phone_number: "0900000000",
    street_address: "123 Nguyễn Huệ",
    city: "Thành phố Hồ Chí Minh",
  },
  items: cartItems.map((item) => ({
    product_id: item.product.id,
    variant_id: item.variant?.id ?? null,
    product_name: item.product.name,
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
