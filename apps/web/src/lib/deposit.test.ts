import { describe, expect, it } from "vitest";
import {
  DEPOSIT_LOW_PCT_MIN_ORDER_TOTAL,
  DEPOSIT_MIN_PCT,
  DEPOSIT_MIN_PCT_PRE_ORDER,
  DEPOSIT_MAX_PCT,
  clampDepositPercentage,
  canUseDeposit,
  hasLowPctDeposit,
  minDepositPercentage,
} from "./deposit";

const T = DEPOSIT_LOW_PCT_MIN_ORDER_TOTAL;
const base = {
  hasPreOrder: false,
  orderTotal: 1_000_000,
  isPickup: false,
  isFeePending: false,
};

describe("canUseDeposit", () => {
  it("allows regular orders at any total", () => {
    // The 5,000,000₫ cap this replaced blocked high-value orders, which is the
    // opposite of the business rule. There is no maximum total now.
    expect(canUseDeposit(base)).toBe(true);
    expect(canUseDeposit({ ...base, orderTotal: T })).toBe(true);
    expect(canUseDeposit({ ...base, orderTotal: 50_000_000 })).toBe(true);
  });

  it("allows pre-order orders at any total", () => {
    expect(
      canUseDeposit({ ...base, hasPreOrder: true, orderTotal: 50_000_000 })
    ).toBe(true);
  });

  it("blocks fee-pending courier tiers with and without pre-order", () => {
    expect(canUseDeposit({ ...base, isFeePending: true })).toBe(false);
    expect(
      canUseDeposit({ ...base, isFeePending: true, hasPreOrder: true })
    ).toBe(false);
  });

  it("blocks store pickup with and without pre-order", () => {
    expect(canUseDeposit({ ...base, isPickup: true })).toBe(false);
    expect(canUseDeposit({ ...base, isPickup: true, hasPreOrder: true })).toBe(
      false
    );
  });
});

describe("minDepositPercentage", () => {
  it("allows 1% only ABOVE the threshold", () => {
    expect(minDepositPercentage(false, T + 1)).toBe(DEPOSIT_MIN_PCT);
    expect(minDepositPercentage(false, 13_500_000)).toBe(DEPOSIT_MIN_PCT);
    expect(minDepositPercentage(false, 50_000_000)).toBe(DEPOSIT_MIN_PCT);
  });

  it("floors at 20% at or below the threshold", () => {
    // Boundary is strict: exactly the threshold is NOT above it.
    expect(minDepositPercentage(false, T)).toBe(DEPOSIT_MIN_PCT_PRE_ORDER);
    expect(minDepositPercentage(false, T - 1)).toBe(DEPOSIT_MIN_PCT_PRE_ORDER);
    expect(minDepositPercentage(false, 1_000_000)).toBe(
      DEPOSIT_MIN_PCT_PRE_ORDER
    );
    expect(minDepositPercentage(false, 0)).toBe(DEPOSIT_MIN_PCT_PRE_ORDER);
  });

  it("keeps pre-order at 20% regardless of total", () => {
    expect(minDepositPercentage(true, 1_000_000)).toBe(
      DEPOSIT_MIN_PCT_PRE_ORDER
    );
    expect(minDepositPercentage(true, T)).toBe(DEPOSIT_MIN_PCT_PRE_ORDER);
    // Even far above the threshold, a pre-order never drops to 1%.
    expect(minDepositPercentage(true, 50_000_000)).toBe(
      DEPOSIT_MIN_PCT_PRE_ORDER
    );
  });
});

describe("hasLowPctDeposit", () => {
  it("is true only for a non-preorder order above the threshold", () => {
    expect(hasLowPctDeposit(false, T + 1)).toBe(true);
    expect(hasLowPctDeposit(false, T)).toBe(false);
    expect(hasLowPctDeposit(true, T + 1)).toBe(false);
  });

  it("agrees with minDepositPercentage", () => {
    for (const total of [0, 1, T - 1, T, T + 1, 99_000_000]) {
      for (const pre of [false, true]) {
        expect(hasLowPctDeposit(pre, total)).toBe(
          minDepositPercentage(pre, total) === DEPOSIT_MIN_PCT
        );
      }
    }
  });
});

describe("clampDepositPercentage", () => {
  it("floors a 1% request when the order is below the threshold", () => {
    // The server-side backstop: a crafted request must not store 1% on an order
    // that does not qualify for it.
    expect(clampDepositPercentage(1, false, T - 1)).toBe(
      DEPOSIT_MIN_PCT_PRE_ORDER
    );
    expect(clampDepositPercentage(1, false, 7_000_000)).toBe(
      DEPOSIT_MIN_PCT_PRE_ORDER
    );
    expect(clampDepositPercentage(1, false, T)).toBe(
      DEPOSIT_MIN_PCT_PRE_ORDER
    );
  });

  it("keeps 1% when the order qualifies", () => {
    expect(clampDepositPercentage(1, false, T + 1)).toBe(DEPOSIT_MIN_PCT);
    expect(clampDepositPercentage(1, false, 13_500_000)).toBe(DEPOSIT_MIN_PCT);
  });

  it("floors a 1% request on a pre-order at any total", () => {
    expect(clampDepositPercentage(1, true, 50_000_000)).toBe(
      DEPOSIT_MIN_PCT_PRE_ORDER
    );
  });

  it("clamps to the per-mode bounds", () => {
    expect(clampDepositPercentage(0, false, 1_000_000)).toBe(20);
    expect(clampDepositPercentage(0, true, 50_000_000)).toBe(20);
    expect(clampDepositPercentage(99, false, 1_000_000)).toBe(
      DEPOSIT_MAX_PCT
    );
    expect(clampDepositPercentage(99, true, 1_000_000)).toBe(DEPOSIT_MAX_PCT);
    expect(clampDepositPercentage(42.4, false, 1_000_000)).toBe(42);
    expect(clampDepositPercentage(42.4, false, 50_000_000)).toBe(42);
  });

  it("falls back to the default when missing", () => {
    expect(clampDepositPercentage(undefined, false, 1_000_000)).toBe(50);
    expect(clampDepositPercentage(null, true, 1_000_000)).toBe(50);
    expect(clampDepositPercentage(undefined, false, 50_000_000)).toBe(50);
  });

  it("never returns a value outside the legal range", () => {
    for (const total of [0, T - 1, T, T + 1, 99_000_000]) {
      for (const pre of [false, true]) {
        for (const raw of [undefined, null, 0, 1, 20, 79, 80, 100, -5]) {
          const out = clampDepositPercentage(raw, pre, total);
          const min = minDepositPercentage(pre, total);
          expect(out).toBeGreaterThanOrEqual(min);
          expect(out).toBeLessThanOrEqual(DEPOSIT_MAX_PCT);
        }
      }
    }
  });
});