import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/vouchers/remove
 * Remove the currently applied voucher (client-side only via Zustand store).
 * This is a no-op endpoint for consistency with API pattern.
 */
export async function POST() {
	try {
		return NextResponse.json({
			success: true,
			message: "Voucher removed from cart",
		});
	} catch (err) {
		console.error("[POST /api/vouchers/remove] Unexpected error:", err);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
