import "server-only";

import { getAdminClient } from "@/lib/supabase/admin";

export type PaymentPlatformType = "bank" | "momo" | "zalo_pay";

export interface PaymentInformation {
	id: string;
	platform_type: PaymentPlatformType;
	account_number: string;
	platform_name: string;
	account_name: string;
	bank_logo_url: string | null;
}

export async function getPaymentInformation(): Promise<PaymentInformation[]> {
	try {
		// Live DB restricts payment_information to authenticated reads only (no
		// anon policy), so an anon session client returns [] and both the route
		// cache and the warm-up job record empty data. This is a tiny global
		// store config served behind a 300s Redis cache, so the RLS-bypassing
		// admin client (server-only) is the correct access path.
		const supabase = getAdminClient();
		const { data, error } = await supabase
			.from("payment_information")
			.select(
				"id, platform_type, account_number, platform_name, account_name, bank_logo_url",
			)
			.order("created_at", { ascending: true });

		if (error) {
			console.error(
				"[getPaymentInformation] Supabase error:",
				error.message,
			);
			return [];
		}

		return (data ?? []) as PaymentInformation[];
	} catch (err) {
		console.error("[getPaymentInformation] Unexpected error:", err);
		return [];
	}
}

export async function getPrimaryBankInformation(): Promise<PaymentInformation | null> {
	const methods = await getPaymentInformation();
	return methods.find((method) => method.platform_type === "bank") ?? null;
}
