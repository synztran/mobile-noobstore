import { createClient } from "@/lib/supabase/server";

export type PaymentPlatformType = "bank" | "momo" | "zalo_pay";

export interface PaymentInformation {
	id: string;
	platform_type: PaymentPlatformType;
	account_number: string;
	platform_name: string;
	account_name: string;
}

export async function getPaymentInformation(): Promise<PaymentInformation[]> {
	try {
		const supabase = await createClient();
		const { data, error } = await supabase
			.from("payment_information")
			.select(
				"id, platform_type, account_number, platform_name, account_name",
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
