// Customer-facing email lives in the web app, which owns the Resend integration
// and the HTML templates. Admin re-exports the one template it needs instead of
// duplicating a second Resend client that could drift out of sync.
export {
  sendShippingUpdateEmail,
  sendOrderStatusEmail,
  shouldSendOrderStatusEmail,
} from "@web-email";
export type {
  OrderStatusEmailStatus,
  OrderStatusEmailLine,
} from "@web-email";
