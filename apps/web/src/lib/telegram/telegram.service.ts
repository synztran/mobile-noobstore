/**
 * Server-only Telegram notification service.
 * NEVER import this in client components.
 */
import "server-only";
import { formatVND } from "@/lib/currency";
import { isPickupShippingMethod } from "@/lib/shipping-method";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const API_BASE = `https://api.telegram.org/bot${BOT_TOKEN}`;

// ─── Core ────────────────────────────────────────────────────────────────────

async function sendMessage(text: string, destination?: { chatId: string; threadId: number }): Promise<void> {
	const chatId = destination?.chatId ?? CHAT_ID;
	if (!BOT_TOKEN || !chatId) {
		console.warn(
			"[Telegram] TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set.",
		);
		return;
	}

	const res = await fetch(`${API_BASE}/sendMessage`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			chat_id: chatId,
			...(destination ? { message_thread_id: destination.threadId } : {}),
			text,
			parse_mode: "HTML",
		}),
	});

	if (!res.ok) {
		const body = await res.text();
		console.error("[Telegram] Failed to send message:", res.status, body);
	}
}

export async function sendPaymentSecurityAlert(kind: string, count: number): Promise<void> {
	if (!BOT_TOKEN || !CHAT_ID) throw new Error("Telegram alerts not configured");
	const response = await fetch(`${API_BASE}/sendMessage`, {
		method: "POST", headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ chat_id: CHAT_ID, text: `[Payment security] ${kind}\nEvents: ${count}\nReview private admin/database audit logs. No customer browser report is proof of tampering.` }),
		signal: AbortSignal.timeout(10000),
	});
	const result = await response.json();
	if (!response.ok || !result.ok) throw new Error("Telegram security alert failed");
}

// ─── Message Templates ────────────────────────────────────────────────────────

export type NewUserPayload = {
	fullName: string;
	email: string;
	registeredAt?: string;
	provider?: "google" | "email";
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

	const source =
		payload.provider === "google"
			? `🔗 <b>Nguồn:</b> Google`
			: `🛜 <b>Nguồn:</b> mobile web`;

	const text = [
		`🎉 <b>Khách hàng mới đăng ký!</b>`,
		``,
		`👤 <b>Họ tên:</b> ${escapeHtml(payload.fullName)}`,
		`📧 <b>Email:</b> ${escapeHtml(payload.email)}`,
		`🕐 <b>Thời gian:</b> ${time}`,
		source,
	].join("\n");

	await sendMessage(text);
}

/**
 * Format a single voucher entry for the order notification message.
 */
function formatVoucherLine(v: {
	voucher_code?: string | null;
	voucher_discount_amount?: number;
	shipping_discount_amount?: number;
}): string {
	const parts: string[] = [];
	if (v.voucher_code) parts.push(v.voucher_code);
	if (v.voucher_discount_amount) {
		parts.push(
			`-${v.voucher_discount_amount.toLocaleString("vi-VN", { style: "currency", currency: "VND" })} sp`,
		);
	}
	if (v.shipping_discount_amount) {
		parts.push(
			`-${v.shipping_discount_amount.toLocaleString("vi-VN", { style: "currency", currency: "VND" })} ship`,
		);
	}
	return parts.join(" ");
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
	vouchers?: Array<{
		voucher_code?: string | null;
		voucher_discount_amount?: number;
		shipping_discount_amount?: number;
	}>,
	details?: {
		paymentType: string; depositPercentage: number; depositAmount: number; remainingAmount: number;
		shippingMethodId: string | null; shippingMethodName: string;
		address: Record<string, unknown> | null;
	},
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
		...(details ? [
			`<b>Thanh toán:</b> ${details.paymentType === "deposit_cod" ? "Đặt cọc + COD" : "Toàn bộ"} — chưa xác minh nhận tiền`,
			...(details.paymentType === "deposit_cod" ? [
				`<b>Đặt cọc (${details.depositPercentage}%):</b> ${formatVND(details.depositAmount)}`,
				`<b>Còn lại:</b> ${formatVND(details.remainingAmount)}`,
			] : []),
			`<b>Giao nhận:</b> ${escapeHtml(details.shippingMethodName)}`,
			...(!isPickupShippingMethod(details.shippingMethodId) ? [
				`<b>Người nhận:</b> ${escapeHtml(String(details.address?.full_name ?? "Chưa có"))}`,
				`<b>Điện thoại:</b> ${escapeHtml(String(details.address?.phone_number ?? "Chưa có"))}`,
				`<b>Địa chỉ:</b> ${escapeHtml([details.address?.apartment, details.address?.street_address, details.address?.ward, details.address?.district, details.address?.city].filter(Boolean).join(", ") || "Chưa có")}`,
			] : []),
		] : []),
		`🕐 <b>Thời gian:</b> ${time}`,
		itemCount !== undefined
			? `📦 <b>Số lượng sản phẩm:</b> ${itemCount}`
			: undefined,
		vouchers && vouchers.length > 0
			? `🏷️ <b>Voucher:</b> ${vouchers.map(formatVoucherLine).join(", ")}`
			: undefined,
	]
		.filter(Boolean)
		.join("\n");

	await sendMessage(text);
}

/** Send original PNG bytes as a document; Telegram photos may be recompressed. */
export async function sendPaymentEvidenceDocument(png: Uint8Array, caption: string, filename: string): Promise<string> {
	if (!BOT_TOKEN || !CHAT_ID) throw new Error("Telegram evidence destination is not configured");
	const form = new FormData();
	form.set("chat_id", CHAT_ID);
	form.set("caption", caption.slice(0, 1024));
	form.set("document", new Blob([new Uint8Array(png)], { type: "image/png" }), filename);
	const response = await fetch(`${API_BASE}/sendDocument`, { method: "POST", body: form, signal: AbortSignal.timeout(15000) });
	const result = await response.json();
	if (!response.ok || !result.ok || !result.result?.message_id) throw new Error("Telegram evidence delivery failed");
	return String(result.result.message_id);
}

/**
 * Notify store owner that unpaid orders were cancelled after 24h timeout.
 */
export async function notifyOrdersCancelled(
	cancelledCount: number,
	orderIds: string[],
): Promise<void> {
	if (cancelledCount === 0) return;

	const time = new Date().toLocaleString("vi-VN", {
		timeZone: "Asia/Ho_Chi_Minh",
	});

	const text = [
		`🚫 <b>Đơn hàng bị huỷ do quá hạn thanh toán</b>`,
		``,
		`📦 <b>Số đơn bị huỷ:</b> ${cancelledCount}`,
		`🕐 <b>Thời gian:</b> ${time}`,
		cancelledCount > 0
			? `🔢 <b>Mã đơn:</b> ${orderIds.map(escapeHtml).join(", ")}`
			: undefined,
	]
		.filter(Boolean)
		.join("\n");

	await sendMessage(text);
}

/**
 * Notify store owner that a customer cancelled their order.
 */
export async function notifyCustomerCancelledOrder(
	orderNumber: string,
	customerName: string,
	totalPrice: number,
	reason?: string,
): Promise<void> {
	const time = new Date().toLocaleString("vi-VN", {
		timeZone: "Asia/Ho_Chi_Minh",
	});

	const text = [
		`🚫 <b>Đơn hàng bị huỷ bởi khách hàng</b>`,
		``,
		`📦 <b>Mã đơn:</b> ${escapeHtml(orderNumber)}`,
		`👤 <b>Khách hàng:</b> ${escapeHtml(customerName)}`,
		`💰 <b>Tổng tiền:</b> ${totalPrice.toLocaleString("vi-VN", { style: "currency", currency: "VND" })}`,
		`🕐 <b>Thời gian:</b> ${time}`,
		reason?.trim()
			? `📝 <b>Lý do:</b> ${escapeHtml(reason.trim())}`
			: undefined,
	]
		.filter(Boolean)
		.join("\n");

	await sendMessage(text);
}

/**
 * Notify store owner when a customer requests a return/refund on a delivered order.
 */
export async function notifyCustomerRequestReturn(
	orderNumber: string,
	customerName: string,
	totalPrice: number,
	reason?: string,
): Promise<void> {
	const time = new Date().toLocaleString("vi-VN", {
		timeZone: "Asia/Ho_Chi_Minh",
	});

	const text = [
		`↩️ <b>Yêu cầu hoàn hàng mới</b>`,
		``,
		`📦 <b>Mã đơn:</b> ${escapeHtml(orderNumber)}`,
		`👤 <b>Khách hàng:</b> ${escapeHtml(customerName)}`,
		`💰 <b>Tổng tiền:</b> ${totalPrice.toLocaleString("vi-VN", { style: "currency", currency: "VND" })}`,
		`🕐 <b>Thời gian:</b> ${time}`,
		reason?.trim()
			? `📝 <b>Lý do:</b> ${escapeHtml(reason.trim())}`
			: undefined,
		``,
		`⚠️ Gói hàng cần được cửa hàng xác minh trước khi hoàn tiền cho khách.`,
	]
		.filter(Boolean)
		.join("\n");

	await sendMessage(text);
}

/**
 * Notify store owner and customer about a pending unpaid order (reminder).
 */
export async function notifyPaymentReminder(
	orderNumber: string,
	totalPrice: number,
	hoursElapsed: number,
): Promise<void> {
	const time = new Date().toLocaleString("vi-VN", {
		timeZone: "Asia/Ho_Chi_Minh",
	});

	const text = [
		`⏰ <b>Nhắc nhở thanh toán đơn hàng</b>`,
		``,
		`📦 <b>Mã đơn:</b> ${escapeHtml(orderNumber)}`,
		`💰 <b>Tổng tiền:</b> ${totalPrice.toLocaleString("vi-VN", { style: "currency", currency: "VND" })}`,
		`⌛ <b>Đã tạo:</b> ${hoursElapsed} giờ trước`,
		`🕐 <b>Thời gian nhắc:</b> ${time}`,
		`⚠️ Đơn hàng sẽ tự động huỷ sau 24 giờ nếu chưa thanh toán.`,
	].join("\n");

	await sendMessage(text);
}

/**
 * Sends a single batch Telegram message listing all orders that are
 * missing payment. Called once per job run after per-customer emails are sent.
 */
export async function notifyPendingPaymentBatch(
	orderNumbers: string[],
): Promise<void> {
	const time = new Date().toLocaleString("vi-VN", {
		timeZone: "Asia/Ho_Chi_Minh",
	});

	const orderList = orderNumbers
		.map((n) => `  • ${escapeHtml(n)}`)
		.join("\n");

	const text = [
		`⏰ <b>Nhắc nhở thanh toán — ${orderNumbers.length} đơn hàng</b>`,
		``,
		`Các đơn hàng chưa thanh toán (12–20 giờ):`,
		orderList,
		``,
		`🕐 <b>Thời gian:</b> ${time}`,
		`⚠️ Đơn hàng sẽ tự huỷ sau 24 giờ nếu chưa thanh toán.`,
	].join("\n");

	await sendMessage(text);
}

/**
 * Notify store when an IP hits the API rate limit.
 */
export async function notifyRateLimitHit(
	ip: string,
	path: string,
	isAuthenticated: boolean,
): Promise<void> {
	const time = new Date().toLocaleString("vi-VN", {
		timeZone: "Asia/Ho_Chi_Minh",
	});

	const text = [
		`⚠️ <b>Cảnh báo Rate Limit!</b>`,
		``,
		`🌐 <b>IP:</b> ${escapeHtml(ip)}`,
		`🔗 <b>Path:</b> ${escapeHtml(path)}`,
		`🔐 <b>Cookie phiên:</b> ${isAuthenticated ? "Có (chưa xác minh danh tính)" : "Không"}`,
		`Thông báo tối đa một lần/IP trong 10 phút; không tự chứng minh có tấn công.`,
		`🕐 <b>Thời gian:</b> ${time}`,
	].join("\n");

	const chatId = CHAT_ID;
	const threadId = Number(process.env.TELEGRAM_RATE_LIMIT_THREAD_ID);
	if (!chatId || !Number.isSafeInteger(threadId) || threadId <= 0) {
		console.warn("[Telegram] Rate-limit topic is not configured; warning skipped.");
		return;
	}
	await sendMessage(text, { chatId, threadId });
}

// ─── Utils ────────────────────────────────────────────────────────────────────

function escapeHtml(str: string): string {
	return str
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;");
}
