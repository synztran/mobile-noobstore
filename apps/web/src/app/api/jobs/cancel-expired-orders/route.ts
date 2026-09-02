/**
 * POST /api/jobs/cancel-expired-orders
 *
 * Triggers the cancel_expired_orders() DB function which:
 *   - Finds all pending orders created > 24h ago
 *   - Cancels them and restores deducted stock
 *
 * Intended to be called by a pg_cron job, an external cron service
 * (e.g. Vercel Cron, GitHub Actions), or Supabase Edge Function scheduler.
 *
 * Security: Requires CRON_SECRET header to prevent unauthorised calls.
 */
import { getAdminClient } from "@/lib/supabase/admin";
import { requireCronSecret } from "@/lib/auth/requireCronSecret";
import { notifyOrdersCancelled } from "@/lib/telegram/telegram.service";
import { invalidateProductCaches } from "@/lib/redis/cache";
import type { CancelExpiredOrdersResult } from "@/types/order-payment";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
	// ── Auth: verify shared secret from env (fail-closed) ───────────────────
	const authError = requireCronSecret(req);
	if (authError) return authError;

	try {
		const admin = getAdminClient();

		const { data, error } = await (
			admin.rpc as unknown as (
				fn: string,
				args: Record<string, unknown>,
			) => Promise<{ data: unknown; error: { message: string } | null }>
		)("cancel_expired_orders", {});

		if (error) {
			console.error("[cancel-expired-orders] RPC error:", error.message);
			return NextResponse.json({ error: error.message }, { status: 500 });
		}

		const result = data as CancelExpiredOrdersResult;

		// Notify store owner via Telegram
		try {
			await notifyOrdersCancelled(
				result.cancelled_count,
				result.order_ids ?? [],
			);
		} catch (err) {
			console.error(
				"[cancel-expired-orders] Telegram notification failed:",
				err,
			);
		}

		console.log(
			`[cancel-expired-orders] Cancelled ${result.cancelled_count} orders:`,
			result.order_ids,
		);

		// The RPC restored stock for the cancelled orders — invalidate the
		// product cache so /shop and product pages reflect the returned stock.
		if ((result.cancelled_count ?? 0) > 0) {
			try {
				await invalidateProductCaches();
			} catch (cacheErr) {
				console.error(
					"[cancel-expired-orders] cache invalidation failed:",
					cacheErr,
				);
			}
		}

		return NextResponse.json({
			ok: true,
			cancelled_count: result.cancelled_count,
			order_ids: result.order_ids,
		});
	} catch (err) {
		console.error("[cancel-expired-orders] Unexpected error:", err);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
