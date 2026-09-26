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

import { formatVND } from "@/lib/currency";
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
	return (
		process.env.RESEND_FROM_EMAIL ?? "Noob Store <onboarding@resend.dev>"
	);
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
	params: PaymentReminderEmailParams,
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
				error,
			);
			return false;
		}

		return true;
	} catch (err) {
		console.error(
			`[email] Unexpected error sending reminder for order ${orderNumber}:`,
			err,
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
	params: PickupCodeEmailParams,
): Promise<boolean> {
	const { to, orderNumber, fullName, code, expiresAt } = params;

	const minutes = Math.max(
		1,
		Math.round((expiresAt.getTime() - Date.now()) / 60000),
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
				error,
			);
			return false;
		}

		return true;
	} catch (err) {
		console.error(
			`[email] Unexpected error sending pickup code for order ${orderNumber}:`,
			err,
		);
		return false;
	}
}

// ─── HTML template ─────────────────────────────────────────────────────────

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
