/**
 * POST /api/jobs/payment-reminders
 *
 * Fetches all pending orders in the 12–20h unpaid window (via
 * get_pending_payment_orders RPC), sends a single batch Telegram message
 * to the store owner, and stamps payment_reminder_sent_at to prevent
 * duplicate sends.
 *
 * Security: Requires CRON_SECRET header to prevent unauthorised calls.
 */
import { getAdminClient } from "@/lib/supabase/admin";
import { requireCronSecret } from "@/lib/auth/requireCronSecret";
import { notifyPendingPaymentBatch } from "@/lib/telegram/telegram.service";
import type { PendingPaymentOrder } from "@/types/order-payment";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
	// ── Auth: verify shared secret from env (fail-closed) ───────────────────
	const authError = requireCronSecret(req);
	if (authError) return authError;

	try {
		const admin = getAdminClient();

		// ── Fetch orders needing a reminder ───────────────────────────────
		const { data, error } = await (
			admin.rpc as unknown as (
				fn: string,
				args: Record<string, unknown>,
			) => Promise<{ data: unknown; error: { message: string } | null }>
		)("get_pending_payment_orders", {});

		if (error) {
			console.error("[payment-reminders] RPC error:", error.message);
			return NextResponse.json({ error: error.message }, { status: 500 });
		}

		const orders = (data ?? []) as PendingPaymentOrder[];

		if (orders.length === 0) {
			return NextResponse.json({ ok: true, reminders_sent: 0 });
		}

		const eligibleOrderNumbers = orders.map((order) => order.order_number);

		try {
			// Await Telegram so the request does not finish before the send completes.
			// If this fails, we intentionally do not stamp reminders so the next cron
			// run can retry the same orders.
			await notifyPendingPaymentBatch(eligibleOrderNumbers);
		} catch (err) {
			console.error(
				"[payment-reminders] Telegram batch notify failed:",
				err,
			);
			return NextResponse.json(
				{ error: "Failed to send Telegram notification" },
				{ status: 500 },
			);
		}

		let remindersSent = 0;
		const failedOrders: string[] = [];

		for (const order of orders) {
			try {
				// Mark reminder as sent only after Telegram succeeds.
				await (
					admin.rpc as unknown as (
						fn: string,
						args: Record<string, unknown>,
					) => Promise<{
						data: unknown;
						error: { message: string } | null;
					}>
				)("mark_payment_reminder_sent", {
					p_order_id: order.order_id,
				});

				remindersSent++;
			} catch (err) {
				console.error(
					`[payment-reminders] Failed to mark order ${order.order_number}:`,
					err,
				);
				failedOrders.push(order.order_number);
			}
		}

		console.log(
			`[payment-reminders] Sent ${remindersSent}/${orders.length} reminders`,
		);

		return NextResponse.json({
			ok: true,
			reminders_sent: remindersSent,
			total_eligible: orders.length,
			...(failedOrders.length > 0 && { failed: failedOrders }),
		});
	} catch (err) {
		console.error("[payment-reminders] Unexpected error:", err);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
