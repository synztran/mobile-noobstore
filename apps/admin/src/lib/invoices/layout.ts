export const INVOICE_SECTIONS = [
	{ id: "company", label: "Cửa hàng & mã hóa đơn" },
	{ id: "customer", label: "Khách hàng & thông tin đơn" },
	{ id: "items", label: "Sản phẩm và dịch vụ" },
	{ id: "totals", label: "Tổng tiền & thanh toán" },
	{ id: "signature", label: "Chữ ký xác nhận" },
	{ id: "notes", label: "Ghi chú & điều khoản" },
] as const;

export type InvoiceSectionId = (typeof INVOICE_SECTIONS)[number]["id"];
export const DEFAULT_INVOICE_LAYOUT = INVOICE_SECTIONS.map(({ id }) => id);

export function normalizeInvoiceLayout(value: unknown): InvoiceSectionId[] {
	const supplied = Array.isArray(value) ? value : [];
	const valid = new Set<string>(DEFAULT_INVOICE_LAYOUT);
	const sections = supplied.filter(
		(section): section is InvoiceSectionId => typeof section === "string" && valid.has(section),
	);
	return [...new Set(sections), ...DEFAULT_INVOICE_LAYOUT.filter((section) => !sections.includes(section))];
}
