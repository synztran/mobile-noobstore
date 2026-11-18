import { describe, expect, it } from "vitest";
import { formatVND } from "./currency";

/**
 * Admin's formatVND. See apps/web/src/lib/currency.test.ts for why the
 * formatter is memoised. The behaviour asserted here is intentionally NOT
 * identical to the web copy: admin does not clamp negatives, because the price
 * inputs surface negative adjustments. That divergence is deliberate.
 */
function reference(amount: number): string {
	return new Intl.NumberFormat("vi-VN", {
		style: "currency",
		currency: "VND",
		maximumFractionDigits: 0,
	}).format(amount);
}

/**
 * Note the separator before "₫" is U+00A0 NO-BREAK SPACE. Written as an
 * escape so it is visible rather than an invisible literal.
 */
const NBSP = "\u00a0";

describe("formatVND (admin)", () => {
	it("matches a freshly-constructed formatter", () => {
		for (const amount of [0, 1, 999, 285000, 1_500_000, 10_000_000, 99_999_999]) {
			expect(formatVND(amount)).toBe(reference(amount));
		}
	});

	it("renders the documented examples", () => {
		expect(formatVND(285000)).toBe(`285.000${NBSP}₫`);
		expect(formatVND(1500000)).toBe(`1.500.000${NBSP}₫`);
		expect(formatVND(0)).toBe(`0${NBSP}₫`);
	});

	it("does NOT clamp negatives, unlike the web copy", () => {
		// Guard against someone "fixing" this to match web.
		expect(formatVND(-1000)).toBe(reference(-1000));
		expect(formatVND(-1000)).not.toBe(`0${NBSP}₫`);
	});
});