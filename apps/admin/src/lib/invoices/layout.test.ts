import { describe, expect, it } from "vitest";
import { DEFAULT_INVOICE_LAYOUT, normalizeInvoiceLayout } from "./layout";

describe("normalizeInvoiceLayout", () => {
	it("uses canonical order for non-array values", () => {
		expect(normalizeInvoiceLayout(null)).toEqual(DEFAULT_INVOICE_LAYOUT);
	});

	it("drops unknown and duplicate sections, then appends missing sections", () => {
		expect(normalizeInvoiceLayout(["items", "bogus", "items", "company"])).toEqual([
			"items", "company", "customer", "totals", "signature", "notes",
		]);
	});

	it("keeps a complete custom order", () => {
		expect(normalizeInvoiceLayout([...DEFAULT_INVOICE_LAYOUT].reverse())).toEqual(
			[...DEFAULT_INVOICE_LAYOUT].reverse(),
		);
	});
});
