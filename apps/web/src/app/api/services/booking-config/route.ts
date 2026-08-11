import {
	CACHE_KEYS,
	publicCacheHeaders,
	readThroughCache,
} from "@/lib/redis/cache";
import { getBookingConfigData } from "@/lib/services-server";
import { NextResponse } from "next/server";

export const revalidate = 120;

export type {
	BookingConfigResponse,
	BookingOption,
	BookingOptionValue,
	BookingSection,
	BookingSectionKey,
	BookingService,
} from "@/lib/services-server";

// ─── GET /api/services/booking-config ────────────────────────────────────────
// Returns active services grouped by booking section for the unified form.

export async function GET() {
	try {
		const response = await readThroughCache(
			CACHE_KEYS.bookingConfig,
			120,
			getBookingConfigData,
		);

		return NextResponse.json(response, { headers: publicCacheHeaders() });
	} catch (err) {
		return NextResponse.json(
			{ error: err instanceof Error ? err.message : "Failed to load booking config" },
			{ status: 500 },
		);
	}
}