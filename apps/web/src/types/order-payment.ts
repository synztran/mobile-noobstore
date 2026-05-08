/**
 * TypeScript interfaces for the order payment expiry feature.
 * These mirror the DB schema added in migration 027.
 */

// ─── Payment information (from payment_information table) ──────────────────

export type PaymentPlatformType = "bank" | "momo" | "zalo_pay";

export interface PaymentInformation {
	id: string;
	platform_type: PaymentPlatformType;
	/** Bank account number or wallet phone/ID */
	account_number: string;
	/** Human-readable platform name, e.g. "Vietcombank" */
	platform_name: string;
	/** Account holder name shown on QR */
	account_name: string;
	created_at: string;
	updated_at: string;
}

// ─── Order expiry state (columns added in migration 027) ────────────────────

/** Subset of Order that includes the new expiry-tracking columns */
export interface OrderPaymentState {
	id: string;
	order_number: string;
	status: "pending" | "paid" | "shipped" | "delivered" | "cancelled";
	total_price: number;
	created_at: string;
	updated_at: string | null;
	/** Set when a payment reminder email/notification was sent */
	payment_reminder_sent_at: string | null;
	/** Set when the order was auto-cancelled due to missing payment */
	cancelled_at: string | null;
}

// ─── Pending payment order (returned by get_pending_payment_orders RPC) ─────

/** Row returned by the get_pending_payment_orders() DB function */
export interface PendingPaymentOrder {
	order_id: string;
	order_number: string;
	user_id: string | null;
	total_price: number;
	created_at: string;
}

// ─── Cancel expired orders result (returned by cancel_expired_orders RPC) ───

export interface CancelExpiredOrdersResult {
	cancelled_count: number;
	order_ids: string[];
}

// ─── QR Code payment parameters ─────────────────────────────────────────────

/**
 * Parameters used to generate a VietQR / MoMo QR code URL for an order.
 * Standard VietQR spec: https://vietqr.io/danh-sach-api/api-tao-ma-qr/
 */
export interface OrderQRCodeParams {
	/** Bank/wallet account number */
	accountNumber: string;
	/** Bank BIN code (e.g. "970436" for VPBank) — required for VietQR */
	bankBin?: string;
	/** Account holder name */
	accountName: string;
	/** Transfer amount in VND */
	amount: number;
	/** Transfer description shown on QR — typically the order_number */
	description: string;
}

// ─── Payment info API response ───────────────────────────────────────────────

/** Response shape from GET /api/payment-information */
export interface PaymentInformationResponse {
	data: PaymentInformation[];
}

// ─── Reminder notification payload ──────────────────────────────────────────

/** Used by the reminder notification job (/api/jobs/payment-reminders) */
export interface PaymentReminderPayload {
	order_id: string;
	order_number: string;
	user_id: string | null;
	total_price: number;
	/** ISO timestamp when the order was created */
	created_at: string;
	/** Hours elapsed since order creation (computed by caller) */
	hours_elapsed: number;
}
