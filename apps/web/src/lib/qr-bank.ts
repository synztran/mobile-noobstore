import type { PaymentInformation } from "@/lib/payment-information";

/**
 * Builds a SePay QR image URL for bank transfer.
 * @param bank     The bank payment method configuration
 * @param amount   The amount to transfer (VND)
 * @param message  The transfer reference/description
 */
export function buildQRBank(
	bank: PaymentInformation,
	amount: number,
	message: string,
): string {
	const query = new URLSearchParams({
		acc: bank.account_number,
		bank: bank.platform_name,
		amount: String(amount),
		des: message,
		template: "compact",
	});
	return `https://qr.sepay.vn/img?${query.toString()}`;
}
