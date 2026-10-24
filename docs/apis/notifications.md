# Notifications API

All notification routes are authenticated and require a signed-in user.

## GET `/api/notifications`

Returns latest notifications for the current user.

### Query params

- `limit` (optional, default `30`, max `100`)

### Response

```json
{
  "notifications": [
    {
      "id": "...",
      "title": "NoobStore",
      "body": "...",
      "type": "general",
      "deep_link": "/profile/notifications",
      "metadata": {},
      "read_at": null,
      "created_at": "2026-01-01T00:00:00.000Z"
    }
  ]
}
```

## POST `/api/notifications/read`

Marks one notification or all unread notifications as read.

### Body

```json
{ "notificationId": "..." }
```

or

```json
{ "markAll": true }
```

### Response

```json
{ "success": true }
```

## POST `/api/notifications/subscribe`

Stores/updates web push subscription for current user.

### Body

```json
{
  "endpoint": "https://...",
  "p256dh": "...",
  "auth": "...",
  "userAgent": "...",
  "devicePlatform": "..."
}
```

## POST `/api/notifications/unsubscribe`

Disables a subscription endpoint for the current user.

### Body

```json
{ "endpoint": "https://..." }
```

## POST `/api/notifications/push-self`

Creates a notification row and dispatches push via Supabase Edge Function.

### Body

```json
{
  "title": "NoobStore",
  "body": "This is a test",
  "deepLink": "/profile/notifications",
  "type": "test"
}
```

## Required Environment Variables

Next.js API:

- `NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NOTIFICATION_INTERNAL_SECRET`

Supabase Edge Function (`send-web-push`):

- `WEB_PUSH_PUBLIC_KEY`
- `WEB_PUSH_PRIVATE_KEY`
- `WEB_PUSH_SUBJECT`
- `NOTIFICATION_INTERNAL_SECRET`

Notes:

- Keep `NOTIFICATION_INTERNAL_SECRET` identical in Next.js and Supabase function secrets.
- On iOS, users must install app to home screen and allow notifications.

---

# Order status emails

When staff change an order's status in the **admin** app, the customer is emailed
for the paid and in-transit states. This is a separate channel from the push
notifications above — same four statuses, deeper content (line items, delivery
address, order link).

## Statuses that send an email

| Status | Sent? | Why |
|---|---|---|
| `confirmed` | yes | Payment confirmed (non-deposit orders). |
| `first_paid` | yes | Deposit received — `payment_type = "deposit_cod"` orders are **blocked** from `confirmed` and forced to this. |
| `second_paid` | yes | Remaining balance received. |
| `delivering` | yes | Parcel is on its way. |
| `pending` | no | Nothing has happened yet. |
| `delivered` / `returning` / `cancelled` / `refunded` | no | No email. |

`first_paid` and `second_paid` are in the list **because deposit and pre-order
orders can never reach `confirmed`** — without them those customers would never
be told anything happened to their order.

## Implementation

| Piece | File |
|---|---|
| Sender + HTML template | `apps/web/src/lib/email/email.service.ts` (`sendOrderStatusEmail`) |
| Re-export for admin | `apps/admin/src/lib/email.ts` (via the `@web-email` tsconfig alias) |
| Shared notifier | `apps/admin/src/lib/order-status-email.ts` (`notifyOrderStatusEmail`) |
| Single order | `apps/admin/src/app/api/orders/[id]/route.ts` (after the status write) |
| Bulk orders | `apps/admin/src/app/api/orders/bulk-status/route.ts` |

Both admin routes call the same notifier. **Keep them in sync** — a notification
added to only one silently skips every customer processed through the other.

The notifier is fired fire-and-forget after the status write, so a Resend outage
never turns a saved order into a failed update for the operator. It logs a
`console.error` on failure and a `console.warn` on skip, and returns a
discriminated result (`sent` / `failed` / `skipped`) rather than a bare boolean.

## Requirements and known gaps

- **`RESEND_API_KEY` and `RESEND_FROM_EMAIL` must be set in BOTH apps.** The
  email service lives in `apps/web` but admin sends through it, so the admin
  deployment needs its own credentials. Without them a send fails *silently* —
  the service swallows the error and returns `false`.
- **Guest orders are skipped.** `orders.user_id` is nullable; a guest checkout
  has no account and therefore no reachable inbox. Same rule as the existing
  shipping-update email.
- **No retry or queue.** If Resend is unavailable the mail is lost; there is no
  queue anywhere in this codebase. Re-saving the same status will not re-send
  (the single-order route gates on an actual status *transition*).
- Variant labels on emailed line items come from `order_item_components` —
  `order_items` has no `variant_name` column.
