/**
 * Email service using Resend.
 *
 * Environment variables required:
 *   RESEND_API_KEY      — from https://resend.com/api-keys
 *   RESEND_FROM_EMAIL   — verified sender address, e.g. "Noob Store <no-reply@yourdomain.com>"
 *
 * Note: During development you can use "onboarding@resend.dev" as the from
 * address to send to your own email without domain verification.
 */

// Relative, not the "@/lib/currency" alias: the admin app re-exports
// sendShippingUpdateEmail from this module, and "@/..." would resolve against
// the *consuming* app's tsconfig — binding this to admin's currency helper
// instead of this one.
import { formatVND } from "../currency";
import { Resend } from "resend";

let _resend: Resend | null = null;

function getResend(): Resend {
  if (!_resend) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error("RESEND_API_KEY environment variable is not set.");
    }
    _resend = new Resend(apiKey);
  }
  return _resend;
}

function getFromAddress(): string {
  return process.env.RESEND_FROM_EMAIL ?? "Noob Store <onboarding@resend.dev>";
}

// ─── Payment reminder email ────────────────────────────────────────────────

interface PaymentReminderEmailParams {
  to: string;
  orderNumber: string;
  totalPrice: number;
  hoursElapsed: number;
}

/**
 * Sends a payment reminder email to a customer with a pending order.
 * Returns true if sent successfully, false on failure.
 */
export async function sendPaymentReminderEmail(
  params: PaymentReminderEmailParams
): Promise<boolean> {
  const { to, orderNumber, totalPrice, hoursElapsed } = params;

  const hoursRemaining = 24 - hoursElapsed;
  const formattedTotal = formatVND(totalPrice);

  try {
    const resend = getResend();
    const { error } = await resend.emails.send({
      from: getFromAddress(),
      to,
      subject: `[Noob Store] Nhắc nhở thanh toán đơn hàng #${orderNumber}`,
      html: buildPaymentReminderHtml({
        orderNumber,
        formattedTotal,
        hoursElapsed,
        hoursRemaining,
      }),
    });

    if (error) {
      console.error(
        `[email] Failed to send reminder for order ${orderNumber}:`,
        error
      );
      return false;
    }

    return true;
  } catch (err) {
    console.error(
      `[email] Unexpected error sending reminder for order ${orderNumber}:`,
      err
    );
    return false;
  }
}

// ─── Pickup code email ─────────────────────────────────────────────────────

interface PickupCodeEmailParams {
  to: string;
  orderNumber: string;
  fullName: string;
  code: string;
  expiresAt: Date;
}

/**
 * Sends the one-time pickup code to a customer who chose in-store pickup.
 * The code is only ever sent per-request (it is never stored in plaintext), so
 * each call regenerates a fresh code at the caller's discretion. Returns true
 * if sent successfully, false on failure.
 */
export async function sendPickupCodeEmail(
  params: PickupCodeEmailParams
): Promise<boolean> {
  const { to, orderNumber, fullName, code, expiresAt } = params;

  const minutes = Math.max(
    1,
    Math.round((expiresAt.getTime() - Date.now()) / 60000)
  );

  try {
    const resend = getResend();
    const { error } = await resend.emails.send({
      from: getFromAddress(),
      to,
      subject: `[Noob Store] Mã nhận hàng đơn #${orderNumber}`,
      html: buildPickupCodeHtml({
        orderNumber,
        fullName,
        code,
        minutes,
      }),
    });

    if (error) {
      console.error(
        `[email] Failed to send pickup code for order ${orderNumber}:`,
        error
      );
      return false;
    }

    return true;
  } catch (err) {
    console.error(
      `[email] Unexpected error sending pickup code for order ${orderNumber}:`,
      err
    );
    return false;
  }
}

// ─── Shipping update email ─────────────────────────────────────────────────

interface ShippingUpdateEmailParams {
  to: string;
  orderNumber: string;
  /**
   * Pre-formatted VND string, or null when the courier rate has not been
   * quoted yet. Formatted by the caller rather than here so this module stays
   * free of app-scoped imports and can be re-exported by the admin app.
   */
  formattedFee: string | null;
  /** True when this email is the notice that a quoted amount now exists. */
  feeWasQuoted: boolean;
  trackingNumber: string | null;
  carrierName: string | null;
  trackingUrl: string | null;
}

/**
 * Tells a customer that their order's delivery details changed — a courier rate
 * was quoted, and/or a tracking number was attached.
 *
 * Courier tiers are ordered without a shipping fee because the BE / Grab /
 * Green SM rate depends on the parcel. This is how the customer learns the
 * amount they now owe, so the wording has to make clear that the fee is a real
 * charge rather than a correction. Returns true if sent, false on failure.
 */
export async function sendShippingUpdateEmail(
  params: ShippingUpdateEmailParams
): Promise<boolean> {
  const {
    to,
    orderNumber,
    formattedFee,
    feeWasQuoted,
    trackingNumber,
    carrierName,
    trackingUrl,
  } = params;

  try {
    const resend = getResend();
    const { error } = await resend.emails.send({
      from: getFromAddress(),
      to,
      subject: feeWasQuoted
        ? `[Noob Store] Phí vận chuyển đơn #${orderNumber}`
        : `[Noob Store] Vận chuyển đơn #${orderNumber}`,
      html: buildShippingUpdateHtml({
        orderNumber,
        formattedFee,
        feeWasQuoted,
        trackingNumber,
        carrierName,
        trackingUrl,
      }),
    });

    if (error) {
      console.error(
        `[email] Failed to send shipping update for order ${orderNumber}:`,
        error
      );
      return false;
    }

    return true;
  } catch (err) {
    console.error(
      `[email] Unexpected error sending shipping update for order ${orderNumber}:`,
      err
    );
    return false;
  }
}

// ─── Order status email ───────────────────────────────────────────────────

/**
 * Statuses that trigger a customer-facing status email.
 *
 * `confirmed` is deliberately paired with the two deposit statuses: the admin
 * order route REJECTS `confirmed` for `payment_type = "deposit_cod"` and forces
 * `first_paid` / `second_paid` instead (see the deposit guards in
 * apps/admin/src/app/api/orders/[id]/route.ts). Without those two, no deposit or
 * pre-order customer would ever be told anything happened to their order.
 */
export const ORDER_STATUS_EMAIL_STATUSES = [
  "confirmed",
  "delivering",
  "first_paid",
  "second_paid",
] as const;

export type OrderStatusEmailStatus =
  (typeof ORDER_STATUS_EMAIL_STATUSES)[number];

/** One purchasable line in the order summary. */
export interface OrderStatusEmailLine {
  name: string;
  /** Component/variant label — lives on order_item_components, not order_items. */
  variantName?: string | null;
  quantity: number;
  /** Pre-formatted by the caller, same as formattedFee above. */
  formattedLineTotal: string;
}

export interface OrderStatusEmailParams {
  to: string;
  orderNumber: string;
  status: OrderStatusEmailStatus;
  /** Customer's name; falls back to a neutral greeting when unknown. */
  fullName?: string | null;
  /** Pre-formatted VND total. */
  formattedTotal: string;
  /** Pre-formatted VND shipping fee, or null when not quoted / free. */
  formattedShippingFee: string | null;
  /** Already-flattened address line, via buildCustomerAddress in admin. */
  formattedAddress?: string | null;
  lines: OrderStatusEmailLine[];
  /** Deep link to the customer's order page. */
  orderUrl?: string | null;
}

/**
 * Per-status copy. Kept as data rather than branches inside the template so the
 * wording is reviewable in one place and the HTML stays a straight join.
 *
 * Headlines deliberately track the push-notification copy in the admin order
 * route, so a customer who receives both reads the same sentence twice.
 */
const ORDER_STATUS_COPY: Record<
  OrderStatusEmailStatus,
  { subject: (orderNumber: string) => string; heading: string; body: string }
> = {
  confirmed: {
    subject: (n) => `[Noob Store] Xác nhận đơn #${n}`,
    heading: "Đơn hàng đã được xác nhận",
    body: "Chúng tôi đã nhận đủ thông tin đơn hàng của bạn. Cảm ơn bạn đã tin tưởng Noob Store!",
  },
  first_paid: {
    subject: (n) => `[Noob Store] Đã nhận tiền đặt cọc đơn #${n}`,
    heading: "Đã nhận tiền đặt cọc",
    body: "Chúng tôi đã nhận được khoản đặt cọc đầu tiên của đơn hàng. Phần còn lại sẽ được thông báo khi đến hạn.",
  },
  second_paid: {
    subject: (n) => `[Noob Store] Đã thanh toán đủ đơn #${n}`,
    heading: "Đã thanh toán đủ",
    body: "Chúng tôi đã nhận đủ thanh toán cho đơn hàng của bạn. Đơn hàng sẽ sớm được chuẩn bị giao.",
  },
  delivering: {
    subject: (n) => `[Noob Store] Đơn #${n} đang được vận chuyển`,
    heading: "Đơn hàng đang được vận chuyển",
    body: "Đơn hàng của bạn đã rời kho và đang trên đường đến địa chỉ của bạn.",
  },
};

/**
 * True when a status should produce a customer email. Pure — exported so the
 * trigger rule can be unit-tested without touching Resend.
 */
export function shouldSendOrderStatusEmail(
  status: string | null | undefined
): status is OrderStatusEmailStatus {
  return (
    !!status &&
    (ORDER_STATUS_EMAIL_STATUSES as readonly string[]).includes(status)
  );
}

/**
 * Notifies a customer that their order moved to a paid or in-transit state.
 * Fired from the admin order routes. Returns true if sent, false on failure —
 * it never throws, so a Resend outage can never surface as a failed status save
 * to the operator.
 */
export async function sendOrderStatusEmail(
  params: OrderStatusEmailParams
): Promise<boolean> {
  const {
    to,
    orderNumber,
    status,
    fullName,
    formattedTotal,
    formattedShippingFee,
    formattedAddress,
    lines,
    orderUrl,
  } = params;

  if (!shouldSendOrderStatusEmail(status)) return false;

  try {
    const resend = getResend();
    const copy = ORDER_STATUS_COPY[status];
    const { error } = await resend.emails.send({
      from: getFromAddress(),
      to,
      subject: copy.subject(orderNumber),
      html: buildOrderStatusHtml({
        orderNumber,
        status,
        fullName,
        formattedTotal,
        formattedShippingFee,
        formattedAddress,
        lines,
        orderUrl,
      }),
    });

    if (error) {
      console.error(
        `[email] Failed to send order status (${status}) for order ${orderNumber}:`,
        error
      );
      return false;
    }

    return true;
  } catch (err) {
    console.error(
      `[email] Unexpected error sending order status (${status}) for order ${orderNumber}:`,
      err
    );
    return false;
  }
}

// ─── HTML template ─────────────────────────────────────────────────────────

interface ShippingUpdateTemplateParams {
  orderNumber: string;
  formattedFee: string | null;
  feeWasQuoted: boolean;
  trackingNumber: string | null;
  carrierName: string | null;
  trackingUrl: string | null;
}

function buildShippingUpdateHtml(p: ShippingUpdateTemplateParams): string {
  // Only render the rows we actually have, so the summary box never shows an
  // empty "Phí vận chuyển: —" line.
  const feeRow =
    p.formattedFee === null
      ? ""
      : `
                <tr>
                  <td style="font-size:14px;color:#888;padding-bottom:8px;">Phí vận chuyển</td>
                  <td align="right" style="font-size:14px;font-weight:600;color:#1a1a1a;padding-bottom:8px;">${p.formattedFee}</td>
                </tr>`;

  const carrierRow = p.carrierName
    ? `
                <tr>
                  <td style="font-size:14px;color:#888;padding-bottom:8px;">Đơn vị vận chuyển</td>
                  <td align="right" style="font-size:14px;font-weight:600;color:#1a1a1a;padding-bottom:8px;">${p.carrierName}</td>
                </tr>`
    : "";

  const trackingRow = p.trackingNumber
    ? `
                <tr>
                  <td style="font-size:14px;color:#888;">Mã vận đơn</td>
                  <td align="right" style="font-size:14px;font-weight:600;color:#1a1a1a;font-family:monospace;">${p.trackingNumber}</td>
                </tr>`
    : "";

  const trackingButton =
    p.trackingUrl === null
      ? ""
      : `
              <table cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td style="background:#1a1a1a;border-radius:8px;padding:14px 28px;">
                    <a href="${p.trackingUrl}"
                       style="color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;">
                      Theo dõi vận đơn →
                    </a>
                  </td>
                </tr>
              </table>`;

  const feeExplainer = p.feeWasQuoted
    ? `
              <p style="margin:0 0 24px;color:#666;font-size:15px;line-height:1.6;">
                Khi đặt hàng, phí vận chuyển chưa được báo trước vì tùy thuộc vào
                khối lượng và đơn vị vận chuyển thực tế. Đơn hàng
                <strong>#${p.orderNumber}</strong> đã được báo giá với mức phí cập nhật ở trên.
                Số tiền này được cộng vào tổng thanh toán của bạn.
              </p>`
    : `
              <p style="margin:0 0 24px;color:#666;font-size:15px;line-height:1.6;">
                Đơn hàng <strong>#${p.orderNumber}</strong> đã được chuyển sang đơn vị vận chuyển.
                Bạn có thể theo dõi hành trình đơn hàng bằng mã vận đơn bên dưới.
              </p>`;

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Cập nhật vận chuyển</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:#1a1a1a;padding:28px 32px;text-align:center;">
              <span style="color:#ffffff;font-size:22px;font-weight:700;letter-spacing:1px;">NOOB STORE</span>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 32px;">
              <h2 style="margin:0 0 8px;font-size:20px;color:#1a1a1a;">${p.feeWasQuoted ? "Phí vận chuyển đã được cập nhật" : "Đơn hàng đã được gửi đi"}</h2>
              <p style="margin:0 0 24px;color:#666;font-size:15px;line-height:1.6;">
                Chúng tôi có một cập nhật về đơn hàng của bạn.
              </p>

              <!-- Order summary box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f9f9;border-radius:8px;padding:20px;margin-bottom:24px;">
                <tr>
                  <td style="font-size:14px;color:#888;padding-bottom:8px;">Mã đơn hàng</td>
                  <td align="right" style="font-size:14px;font-weight:600;color:#1a1a1a;padding-bottom:8px;">#${p.orderNumber}</td>
                </tr>${feeRow}${carrierRow}${trackingRow}
              </table>

              ${feeExplainer}

              ${trackingButton}

              <p style="margin:0;color:#aaa;font-size:13px;line-height:1.6;">
                Nếu bạn cần hỗ trợ, hãy liên hệ với chúng tôi. Cảm ơn bạn đã mua hàng tại Noob Store!
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9f9f9;padding:20px 32px;text-align:center;border-top:1px solid #eee;">
              <p style="margin:0;color:#aaa;font-size:12px;">© 2026 Noob Store. Tất cả quyền được bảo lưu.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

interface TemplateParams {
  orderNumber: string;
  formattedTotal: string;
  hoursElapsed: number;
  hoursRemaining: number;
}

function buildPaymentReminderHtml(p: TemplateParams): string {
  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Nhắc nhở thanh toán</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:#1a1a1a;padding:28px 32px;text-align:center;">
              <span style="color:#ffffff;font-size:22px;font-weight:700;letter-spacing:1px;">NOOB STORE</span>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 32px;">
              <h2 style="margin:0 0 8px;font-size:20px;color:#1a1a1a;">Đơn hàng của bạn chưa được thanh toán</h2>
              <p style="margin:0 0 24px;color:#666;font-size:15px;line-height:1.6;">
                Đơn hàng <strong>#${p.orderNumber}</strong> đã được đặt ${p.hoursElapsed} giờ trước nhưng chúng tôi chưa nhận được thanh toán.
              </p>

              <!-- Order summary box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f9f9;border-radius:8px;padding:20px;margin-bottom:24px;">
                <tr>
                  <td style="font-size:14px;color:#888;padding-bottom:8px;">Mã đơn hàng</td>
                  <td align="right" style="font-size:14px;font-weight:600;color:#1a1a1a;padding-bottom:8px;">#${p.orderNumber}</td>
                </tr>
                <tr>
                  <td style="font-size:14px;color:#888;padding-bottom:8px;">Tổng tiền</td>
                  <td align="right" style="font-size:14px;font-weight:600;color:#1a1a1a;padding-bottom:8px;">${p.formattedTotal}</td>
                </tr>
                <tr>
                  <td style="font-size:14px;color:#e55;">Thời gian còn lại</td>
                  <td align="right" style="font-size:14px;font-weight:700;color:#e55;">${p.hoursRemaining} giờ</td>
                </tr>
              </table>

              <p style="margin:0 0 24px;color:#666;font-size:15px;line-height:1.6;">
                Vui lòng hoàn tất thanh toán trong vòng <strong>${p.hoursRemaining} giờ tới</strong>.
                Nếu không, đơn hàng sẽ tự động bị huỷ và hàng sẽ được hoàn lại kho.
              </p>

              <!-- CTA button -->
              <table cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td style="background:#1a1a1a;border-radius:8px;padding:14px 28px;">
                    <a href="${process.env.NEXT_PUBLIC_APP_URL ?? "#"}/profile/orders"
                       style="color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;">
                      Thanh toán ngay →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0;color:#aaa;font-size:13px;line-height:1.6;">
                Nếu bạn đã thanh toán rồi, xin hãy bỏ qua email này. Cảm ơn bạn đã mua hàng tại Noob Store!
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9f9f9;padding:20px 32px;text-align:center;border-top:1px solid #eee;">
              <p style="margin:0;color:#aaa;font-size:12px;">© 2026 Noob Store. Tất cả quyền được bảo lưu.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

interface PickupCodeTemplateParams {
  orderNumber: string;
  fullName: string;
  code: string;
  minutes: number;
}

interface OrderStatusTemplateParams extends Omit<OrderStatusEmailParams, "to"> {}

/**
 * Order status email. Same shell as the other templates (560px card, dark
 * header, #f9f9f9 summary box, © footer) — copied rather than extracted, per
 * house convention. Deeper than the push notification on purpose: the line
 * items and order link are what justify sending a mail as well as a push.
 */
function buildOrderStatusHtml(p: OrderStatusTemplateParams): string {
  const copy = ORDER_STATUS_COPY[p.status];

  const shippingRow = p.formattedShippingFee
    ? `
                <tr>
                  <td style="font-size:14px;color:#888;padding-bottom:8px;">Phí vận chuyển</td>
                  <td align="right" style="font-size:14px;font-weight:600;color:#1a1a1a;padding-bottom:8px;">${p.formattedShippingFee}</td>
                </tr>`
    : "";

  const addressRow = p.formattedAddress
    ? `
                <tr>
                  <td style="font-size:14px;color:#888;">Giao đến</td>
                  <td align="right" style="font-size:14px;font-weight:600;color:#1a1a1a;line-height:1.5;">${p.formattedAddress}</td>
                </tr>`
    : "";

  // Variant labels live on order_item_components, so each line can carry one.
  const itemsRows =
    p.lines.length > 0
      ? p.lines
          .map(
            (l) => `
                <tr>
                  <td style="font-size:14px;color:#1a1a1a;padding-bottom:8px;">
                    ${l.name}${
                      l.variantName
                        ? `<br /><span style="font-size:12px;color:#888;">${l.variantName}</span>`
                        : ""
                    }
                  </td>
                  <td align="right" style="font-size:13px;color:#888;padding-bottom:8px;white-space:nowrap;">×${l.quantity}</td>
                  <td align="right" style="font-size:14px;font-weight:600;color:#1a1a1a;padding-bottom:8px;white-space:nowrap;">${l.formattedLineTotal}</td>
                </tr>`
          )
          .join("")
      : "";

  const itemsBlock =
    p.lines.length > 0
      ? `
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td style="font-size:12px;font-weight:700;letter-spacing:0.5px;color:#aaa;text-transform:uppercase;padding-bottom:10px;">Sản phẩm</td>
                  <td></td>
                  <td></td>
                </tr>${itemsRows}
              </table>`
      : "";

  const orderButton = p.orderUrl
    ? `
              <table cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td style="background:#1a1a1a;border-radius:8px;padding:14px 28px;">
                    <a href="${p.orderUrl}"
                       style="color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;">
                      Xem đơn hàng →
                    </a>
                  </td>
                </tr>
              </table>`
    : "";

  const greeting = p.fullName ? `Xin chào ${p.fullName},` : "Xin chào,";

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${copy.heading}</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:#1a1a1a;padding:28px 32px;text-align:center;">
              <span style="color:#ffffff;font-size:22px;font-weight:700;letter-spacing:1px;">NOOB STORE</span>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 32px;">
              <p style="margin:0 0 8px;color:#666;font-size:15px;line-height:1.6;">${greeting}</p>
              <h2 style="margin:0 0 8px;font-size:20px;color:#1a1a1a;">${copy.heading}</h2>
              <p style="margin:0 0 24px;color:#666;font-size:15px;line-height:1.6;">
                ${copy.body}
              </p>

              <!-- Order summary box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f9f9;border-radius:8px;padding:20px;margin-bottom:24px;">
                <tr>
                  <td style="font-size:14px;color:#888;padding-bottom:8px;">Mã đơn hàng</td>
                  <td align="right" style="font-size:14px;font-weight:600;color:#1a1a1a;padding-bottom:8px;">#${p.orderNumber}</td>
                </tr>
                <tr>
                  <td style="font-size:14px;color:#888;padding-bottom:8px;">Tổng cộng</td>
                  <td align="right" style="font-size:14px;font-weight:600;color:#1a1a1a;padding-bottom:8px;">${p.formattedTotal}</td>
                </tr>${shippingRow}${addressRow}
              </table>

              ${itemsBlock}

              ${orderButton}

              <p style="margin:0;color:#aaa;font-size:13px;line-height:1.6;">
                Nếu bạn cần hỗ trợ, hãy liên hệ với chúng tôi. Cảm ơn bạn đã mua hàng tại Noob Store!
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9f9f9;padding:20px 32px;text-align:center;border-top:1px solid #eee;">
              <p style="margin:0;color:#aaa;font-size:12px;">© 2026 Noob Store. Tất cả quyền được bảo lưu.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildPickupCodeHtml(p: PickupCodeTemplateParams): string {
  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Mã nhận hàng</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:#1a1a1a;padding:28px 32px;text-align:center;">
              <span style="color:#ffffff;font-size:22px;font-weight:700;letter-spacing:1px;">NOOB STORE</span>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 32px;">
              <h2 style="margin:0 0 8px;font-size:20px;color:#1a1a1a;">Xin chào ${p.fullName},</h2>
              <p style="margin:0 0 24px;color:#666;font-size:15px;line-height:1.6;">
                Bạn đã chọn nhận hàng tại cửa hàng cho đơn hàng <strong>#${p.orderNumber}</strong>.
                Vui lòng xuất trình mã dưới đây cho nhân viên tại quầy để nhận hàng.
              </p>

              <!-- Code box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f9f9;border:2px dashed #1a1a1a;border-radius:12px;padding:24px;margin-bottom:24px;">
                <tr>
                  <td align="center" style="font-size:40px;font-weight:800;letter-spacing:10px;color:#1a1a1a;padding-bottom:12px;">${p.code}</td>
                </tr>
                <tr>
                  <td align="center" style="font-size:13px;color:#e55;font-weight:600;">Mã có hiệu lực trong ${p.minutes} phút và chỉ dùng được một lần.</td>
                </tr>
              </table>

              <p style="margin:0 0 8px;color:#666;font-size:15px;line-height:1.6;">
                Khi tới nhận hàng, bạn cũng cần xuất trình <strong>CMND/CCCD</strong> để đối chiếu.
                Mã này dùng một lần, nếu hết hạn hoặc bạn không tới kịp hãy mở lại đơn hàng trong ứng dụng
                để tạo mã mới.
              </p>

              <p style="margin:0;color:#aaa;font-size:13px;line-height:1.6;">
                Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email. Cảm ơn bạn đã mua hàng tại Noob Store!
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9f9f9;padding:20px 32px;text-align:center;border-top:1px solid #eee;">
              <p style="margin:0;color:#aaa;font-size:12px;">© 2026 Noob Store. Tất cả quyền được bảo lưu.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
