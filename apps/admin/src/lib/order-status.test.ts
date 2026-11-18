import { describe, expect, it } from "vitest";

import { getPaymentState, isAwaitingPayment } from "./order-status";

/**
 * The payment axis is derived from timestamps only — the orders table has no
 * payments ledger, so `deposit_amount` / `remaining_amount` say what is DUE and
 * `deposit_paid_at` / `paid_at` are the only evidence money moved. These tests
 * pin the precedence, because the order list column and the order-detail modal
 * both render from this function and a silent reorder would make them disagree.
 */
describe("getPaymentState", () => {
  it("reports a full-payment order with no timestamps as unpaid", () => {
    expect(
      getPaymentState({
        paymentType: "full",
        paidAt: null,
        refundedAt: null,
        depositPaidAt: null,
      })
    ).toBe("unpaid");
  });

  it("reports a paid full-payment order as paid", () => {
    expect(
      getPaymentState({
        paymentType: "full",
        paidAt: "2026-10-17T09:00:00Z",
        refundedAt: null,
        depositPaidAt: null,
      })
    ).toBe("paid");
  });

  it("reports a deposit order with no deposit timestamp as awaiting", () => {
    expect(
      getPaymentState({
        paymentType: "deposit_cod",
        paidAt: null,
        refundedAt: null,
        depositPaidAt: null,
      })
    ).toBe("awaiting_deposit");
  });

  it("reports a deposit order with a deposit timestamp as deposit_paid", () => {
    expect(
      getPaymentState({
        paymentType: "deposit_cod",
        paidAt: null,
        refundedAt: null,
        depositPaidAt: "2026-10-17T09:00:00Z",
      })
    ).toBe("deposit_paid");
  });

  // A deposit order settles its balance by stamping `paid_at` on the SECOND
  // instalment. Checking the deposit branch first would keep reporting
  // "deposit_paid" for an order the customer has fully paid.
  it("prefers paid over deposit_paid once the balance is settled", () => {
    expect(
      getPaymentState({
        paymentType: "deposit_cod",
        paidAt: "2026-10-20T09:00:00Z",
        refundedAt: null,
        depositPaidAt: "2026-10-17T09:00:00Z",
      })
    ).toBe("paid");
  });

  it("prefers refunded over every other timestamp", () => {
    expect(
      getPaymentState({
        paymentType: "deposit_cod",
        paidAt: "2026-10-20T09:00:00Z",
        refundedAt: "2026-10-21T09:00:00Z",
        depositPaidAt: "2026-10-17T09:00:00Z",
      })
    ).toBe("refunded");
    expect(
      getPaymentState({
        paymentType: "full",
        paidAt: null,
        refundedAt: "2026-10-21T09:00:00Z",
        depositPaidAt: null,
      })
    ).toBe("refunded");
  });

  // deposit_paid_at is only ever stamped on deposit orders, but a stray value
  // must not make a full-payment order look like a partially-paid one.
  it("ignores a deposit timestamp on a full-payment order", () => {
    expect(
      getPaymentState({
        paymentType: "full",
        paidAt: null,
        refundedAt: null,
        depositPaidAt: "2026-10-17T09:00:00Z",
      })
    ).toBe("unpaid");
  });

  it("treats a missing payment_type as a full-payment order", () => {
    expect(getPaymentState({})).toBe("unpaid");
    expect(getPaymentState({ paymentType: null })).toBe("unpaid");
  });
});

/**
 * The verified-payment form must be reachable exactly while money is still
 * owed. Too wide and staff can "record" payments on settled orders; too narrow
 * and a deposit order at `delivering` cannot record the COD balance that the
 * 158 guard requires before `delivered`, stranding it.
 */
describe("isAwaitingPayment", () => {
  it("accepts a full-payment order while it is pending", () => {
    expect(isAwaitingPayment({ status: "pending" })).toBe(true);
    expect(isAwaitingPayment({ status: "pending", paymentType: "full" })).toBe(
      true
    );
  });

  it("rejects a full-payment order once it is paid or dispatched", () => {
    for (const status of ["confirmed", "delivering", "delivered"]) {
      expect(isAwaitingPayment({ status, paymentType: "full" })).toBe(false);
    }
  });

  it("accepts both deposit instalments of a deposit order", () => {
    expect(
      isAwaitingPayment({ status: "pending", paymentType: "deposit_cod" })
    ).toBe(true);
    expect(
      isAwaitingPayment({ status: "first_paid", paymentType: "deposit_cod" })
    ).toBe(true);
  });

  // Orders placed before the two-instalment flow can still sit in `confirmed`;
  // OrderActionBar maps that to `first_paid` when building the step flow, so the
  // form has to stay reachable for the same reason.
  it("accepts a legacy deposit order sitting in confirmed", () => {
    expect(
      isAwaitingPayment({ status: "confirmed", paymentType: "deposit_cod" })
    ).toBe(true);
  });

  it("accepts a deposit order in delivering only while the balance is owed", () => {
    expect(
      isAwaitingPayment({
        status: "delivering",
        paymentType: "deposit_cod",
        paidAt: null,
      })
    ).toBe(true);
    expect(
      isAwaitingPayment({
        status: "delivering",
        paymentType: "deposit_cod",
        paidAt: "2026-10-20T09:00:00Z",
      })
    ).toBe(false);
  });

  it("rejects a deposit order once the balance is settled", () => {
    expect(
      isAwaitingPayment({ status: "second_paid", paymentType: "deposit_cod" })
    ).toBe(false);
    expect(
      isAwaitingPayment({ status: "delivered", paymentType: "deposit_cod" })
    ).toBe(false);
  });

  it("rejects every terminal or blocked status", () => {
    for (const status of ["cancelled", "refunded", "returning"]) {
      expect(isAwaitingPayment({ status })).toBe(false);
      expect(isAwaitingPayment({ status, paymentType: "deposit_cod" })).toBe(
        false
      );
    }
  });
});