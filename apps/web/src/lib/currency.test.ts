import { describe, expect, it } from "vitest";
import { formatVND } from "./currency";

/**
 * `formatVND` used to build a new `Intl.NumberFormat` on every call. That is
 * expensive (each one compiles an ICU formatter) and it runs once per product
 * row, price and email line — enough to show against Vercel's Active CPU
 * budget. It is now a module-level singleton.
 *
 * These tests pin the exact output so the memoisation can never change what a
 * customer is shown.
 */

/** The pre-optimisation implementation, kept as the reference oracle. */
function reference(amount: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Math.max(0, amount));
}

/**
 * Note the separator before "₫" is U+00A0 NO-BREAK SPACE, not a plain space.
 * Written as an escape here so it is visible — a literal space in the
 * expectation silently fails, and the docstring examples hide the difference.
 */
const NBSP = "\u00a0";

describe("formatVND", () => {
  it("matches a freshly-constructed formatter for realistic prices", () => {
    const amounts = [
      0, 1, 999, 1000, 285000, 1_500_000, 2_450_000, 5_000_000, 10_000_000,
      13_500_000, 99_999_999, 1_234_567_890,
    ];
    for (const amount of amounts) {
      expect(formatVND(amount)).toBe(reference(amount));
    }
  });

  it("renders the documented examples", () => {
    expect(formatVND(285000)).toBe(`285.000${NBSP}₫`);
    expect(formatVND(1500000)).toBe(`1.500.000${NBSP}₫`);
    expect(formatVND(0)).toBe(`0${NBSP}₫`);
  });

  it("clamps negatives to zero — the web copy's documented behaviour", () => {
    // Deliberately NOT the same as apps/admin's copy, which does not clamp.
    // See the note in currency.ts before changing either.
    expect(formatVND(-1000)).toBe(`0${NBSP}₫`);
    expect(formatVND(-5_000_000)).toBe(reference(-5_000_000));
  });

  it("is stable across repeated calls (the formatter is shared, not rebuilt)", () => {
    // A rebuilt formatter would still pass the tests above; this pins that
    // reuse is safe and that no per-call state leaks between invocations.
    const first = formatVND(1_500_000);
    const second = formatVND(999);
    expect(formatVND(1_500_000)).toBe(first);
    expect(second).toBe(reference(999));
  });
});