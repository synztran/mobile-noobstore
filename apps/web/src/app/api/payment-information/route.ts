import {
	getPaymentInformation,
	type PaymentInformation,
} from "@/lib/payment-information";
import { getCache, setCache } from "@/lib/redis/cache";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export interface PaymentInformationResponse {
	methods: PaymentInformation[];
}

export async function GET() {
	try {
		const cacheKey = "payment-information";
		const cached = await getCache<PaymentInformationResponse>(cacheKey);
		if (cached) return NextResponse.json(cached, {
			headers: {
				"Cache-Control":
					"public, s-maxage=60, stale-while-revalidate=300",
			},
		});

		const methods = await getPaymentInformation();
		const result: PaymentInformationResponse = { methods };
		await setCache(cacheKey, result);

		return NextResponse.json(result, {
			headers: {
				"Cache-Control":
					"public, s-maxage=60, stale-while-revalidate=300",
			},
		});
	} catch (err) {
		return NextResponse.json(
			{ error: err instanceof Error ? err.message : "Unknown error" },
			{ status: 500 },
		);
	}
}
