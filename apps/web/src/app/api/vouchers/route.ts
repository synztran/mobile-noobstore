import { createClient } from "@/lib/supabase/server";
import type { VoucherRow } from "@/types/voucher";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/vouchers
 * Fetch all active, non-deleted vouchers within the current time window.
 * Public endpoint (no auth required).
 */
export async function GET() {
	try {
		const supabase = await createClient();
		const voucherClient = supabase as typeof supabase & {
			from: (relation: "vouchers") => {
				select: (columns: string) => {
					eq: (
						column: string,
						value: string,
					) => {
						is: (
							column: string,
							value: null,
						) => {
							lte: (
								column: string,
								value: string,
							) => {
								gte: (
									column: string,
									value: string,
								) => {
									order: (
										column: string,
										options: { ascending: boolean },
									) => PromiseLike<{
										data: unknown[] | null;
										error: unknown;
									}>;
								};
							};
						};
					};
				};
			};
		};

		// Fetch all active vouchers (not deleted, within valid date range, active status)
		const { data: vouchers, error } = await voucherClient
			.from("vouchers")
			.select("*")
			.eq("status", "active")
			.is("deleted_at", null)
			.lte("start_at", new Date().toISOString())
			.gte("end_at", new Date().toISOString())
			.order("created_at", { ascending: false });

		if (error) {
			console.error("[GET /api/vouchers] Database error:", error);
			return NextResponse.json(
				{ error: "Failed to fetch vouchers" },
				{ status: 500 },
			);
		}

		const resolvedVouchers = (vouchers ?? []) as unknown as VoucherRow[];

		return NextResponse.json({
			vouchers: resolvedVouchers,
			data: resolvedVouchers,
		});
	} catch (err) {
		console.error("[GET /api/vouchers] Unexpected error:", err);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
