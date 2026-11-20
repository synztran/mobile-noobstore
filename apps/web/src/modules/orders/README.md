# Module: orders

The orders domain — order list, order detail, order mutations (cancel, return, pickup code), and payment information for the authenticated customer.

## Layout

| Layer | Location | Runs on | Contents |
|---|---|---|---|
| Contract types | `types.ts` | shared | `OrderSummary`, `OrderSummaryProduct`, `OrdersPagination`, `OrdersResponse`, `OrderDetail`, `OrderItemDetail`, `OrderItemComponentDetail`, `OrderStatus`, `OrderStatusResult`, `OrderListFilters` — single source; **never export order types from API route files** |
| Client logic | `client/queries.ts` | client only | `useOrders` (infinite list), `useOrderDetail`, `useOrderByNumber`, `useOrderStatus`, `usePaymentInformation` |
| Client mutations | `client/mutations.ts` | client only | `useCancelOrder`, `useReturnOrder`, `usePickupCode`, `PickupCodeError` |
| Client query keys | `client/query-keys.ts` | client only | Re-exports `orderQueryKeys` from `lib/react-query/router/order` |

API routes under `app/api/user/orders/**` and `app/api/orders/**` are thin HTTP handlers that re-export types from this module.

## Data flow

- **Server Component / page**: N/A — orders are user-scoped and require auth; always fetched client-side.
- **Client Component**: imports react-query hooks from `modules/orders/client/queries` or `mutations`. These call `app/api/user/orders/**` endpoints.
- **Type imports**: always from `@/modules/orders/types`, never from API route files.

## Key consumers

| File | Imports |
|---|---|
| `app/(main)/profile/orders/page.tsx` | `useOrders`, `OrderSummary` |
| `app/(main)/profile/page.tsx` | `useOrders`, `OrderSummary` |
| `components/orders/OrderDetailDrawer.tsx` | `OrderDetail`, `useOrderDetail`, `useCancelOrder`, `useReturnOrder`, `usePickupCode`, `PickupCodeError` |
| `components/orders/OrderTrackingTimeline.tsx` | `OrderDetail` |
| `components/support/CreateTicketForm.tsx` | `OrderItemDetail` |

## Pitfalls

- `lib/react-query/order/api/useOrderQueries.ts` and `useOrderMutations.ts` are **backward-compat shims** only — they re-export from this module. Do not add logic there.
- `lib/react-query/router/order.ts` holds the query key factory + re-exports `OrderStatusResult` and `OrderListFilters`; this will collapse into `client/query-keys.ts` in a future cleanup pass.
- `ServiceOrderDetail` lives in `app/api/user/service-orders/[id]/route.ts` — not this module. Service orders are a separate domain.
