import {
	getPaymentInformation,
	type PaymentInformation,
} from "@/lib/payment-information";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export interface PaymentInformationResponse {
	methods: PaymentInformation[];
}

export async function GET() {
	try {
		const methods = await getPaymentInformation();
		return NextResponse.json<PaymentInformationResponse>(
			{ methods },
			{
				headers: {
					"Cache-Control":
						"public, s-maxage=60, stale-while-revalidate=300",
				},
			},
		);
	} catch (err) {
		return NextResponse.json(
			{ error: err instanceof Error ? err.message : "Unknown error" },
			{ status: 500 },
		);
	}
}
