# Checkout module

Checkout owns order submission and its HTTP contract.

- `types.ts`: shared request/response contract; UI clients import types here.
- `server/submit-order.ts`: server-only orchestration for authenticated order
  submission. Keeps side effects in the same order as the established API.
- `server/submit-order-logic.ts`: pricing, compatibility, voucher validation,
  and serialization helpers used by the server orchestration.
- `app/api/checkout/submit/route.ts`: thin HTTP adapter that delegates the
  request to server orchestration. The `/api/*` rate limit is applied centrally
  by `middleware.ts`; the module assumes the request has passed that boundary.

Do not import server code from client components. Do not export contract types
from an API route. Financial rules must remain server-authoritative.
