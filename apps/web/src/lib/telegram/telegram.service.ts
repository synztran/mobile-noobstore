/**
 * Server-only Telegram notification service.
 * NEVER import this in client components.
 */

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const API_BASE = `https://api.telegram.org/bot${BOT_TOKEN}`;

// ─── Core ────────────────────────────────────────────────────────────────────

async function sendMessage(text: string): Promise<void> {
	if (!BOT_TOKEN || !CHAT_ID) {
		console.warn("[Telegram] TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set.");
		return;
	}

	const res = await fetch(`${API_BASE}/sendMessage`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			chat_id: CHAT_ID,
			text,
			parse_mode: "HTML",
		}),
	});

	if (!res.ok) {
		const body = await res.text();
		console.error("[Telegram] Failed to send message:", res.status, body);
	}
}

// ─── Message Templates ────────────────────────────────────────────────────────

export type NewUserPayload = {
	fullName: string;
	email: string;
	registeredAt?: string;
};

/**
 * Notify when a new customer registers.
 */
export async function notifyNewUserRegistered(
	payload: NewUserPayload,
): Promise<void> {
	const time =
		payload.registeredAt ??
		new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });

	const text = [
		`🎉 <b>Khách hàng mới đăng ký!</b>`,
		``,
		`👤 <b>Họ tên:</b> ${escapeHtml(payload.fullName)}`,
		`📧 <b>Email:</b> ${escapeHtml(payload.email)}`,
		`🕐 <b>Thời gian:</b> ${time}`,
    `🛜 <b>Nguồn:</b> mobile web`,
	].join("\n");

	await sendMessage(text);
}

/**
 *
 * Notify when a new order is placed.
 */
export async function notifyNewOrder(
  orderNumber: string,
  customerName: string,
  totalPrice: number,
  orderTime?: string,
  itemCount?: number,
): Promise<void> {
  const time =
    orderTime ??
    new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });

  const text = [
    `🛒 <b>Đơn hàng mới! Vui lòng kiểm tra</b>`,
    ``,
    `📦 <b>Mã đơn:</b> ${escapeHtml(orderNumber)}`,
    `👤 <b>Khách hàng:</b> ${escapeHtml(customerName)}`,
    `💰 <b>Tổng tiền:</b> ${totalPrice.toLocaleString("vi-VN", { style: "currency", currency: "VND" })}`,
    `🕐 <b>Thời gian:</b> ${time}`,
    itemCount !== undefined ? `📦 <b>Số lượng sản phẩm:</b> ${itemCount}` : undefined,
  ].filter(Boolean).join("\n");

  await sendMessage(text);
}

// ─── Utils ────────────────────────────────────────────────────────────────────

function escapeHtml(str: string): string {
	return str
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;");
}
