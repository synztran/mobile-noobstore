import {
	getPaymentInformation,
	type PaymentInformation,
} from "@/lib/payment-information";
import {
	CACHE_KEYS,
	publicCacheHeaders,
	readThroughCache,
} from "@/lib/redis/cache";
import { NextResponse } from "next/server";

export const revalidate = 300;

export interface PaymentInformationResponse {
	methods: PaymentInformation[];
}

export async function GET() {
	try {
		const result = await readThroughCache<PaymentInformationResponse>(
			CACHE_KEYS.paymentInformation,
			// 24h safety net — payment info changes rarely; staleness after an
			// edit is capped at 24h, or instant via admin cache purge.
			86400,
			async () => {
				const methods = await getPaymentInformation();
				return { methods };
			},
		);

		return NextResponse.json(result, { headers: publicCacheHeaders() });
	} catch (err) {
		return NextResponse.json(
			{ error: err instanceof Error ? err.message : "Unknown error" },
			{ status: 500 },
		);
	}
}