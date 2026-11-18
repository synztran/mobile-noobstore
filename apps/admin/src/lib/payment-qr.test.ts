import { describe, expect, it } from "vitest";

import { paymentQrStages } from "./payment-qr";

/**
 * The admin QR panel re-sends money instructions to customers, so the amount on
 * each QR has to be the amount still owed. These tests pin the stage split and
 * the ordering rule: a deposit order's balance must never look payable before
 * the deposit is covered, or staff will send the wrong QR.
 */
describe("paymentQrStages", () => {
  it("gives a full-payment order one payable stage", () => {
    expect(
      paymentQrStages({ paymentType: "full", total: 1000, deposit: 0, received: 0 })
    ).toEqual([
      { stage: "full", label: "Full payment", amount: 1000, status: "due" },
    ]);
  });

  it("reduces the full-payment amount by every recorded receipt", () => {
    expect(
      paymentQrStages({ paymentType: "full", total: 1000, deposit: 0, received: 400 })
    ).toEqual([
      { stage: "full", label: "Full payment", amount: 600, status: "due" },
    ]);
  });

  it("marks a fully settled order as paid instead of encoding a zero QR", () => {
    expect(
      paymentQrStages({ paymentType: "full", total: 1000, deposit: 0, received: 1200 })
    ).toEqual([
      { stage: "full", label: "Full payment", amount: 0, status: "paid" },
    ]);
  });

  it("splits a deposit order into deposit and balance", () => {
    expect(
      paymentQrStages({
        paymentType: "deposit_cod",
        total: 1000,
        deposit: 300,
        depositPercentage: 30,
        received: 0,
      })
    ).toEqual([
      { stage: "deposit", label: "Deposit (30%)", amount: 300, status: "due" },
      {
        stage: "balance",
        label: "Balance (COD)",
        amount: 700,
        status: "after_deposit",
      },
    ]);
  });

  it("keeps the balance after_deposit while the deposit is only partly paid", () => {
    expect(
      paymentQrStages({
        paymentType: "deposit_cod",
        total: 1000,
        deposit: 300,
        received: 100,
      })
    ).toEqual([
      { stage: "deposit", label: "Deposit", amount: 200, status: "due" },
      {
        stage: "balance",
        label: "Balance (COD)",
        amount: 700,
        status: "after_deposit",
      },
    ]);
  });

  it("makes the balance payable once the deposit is covered", () => {
    expect(
      paymentQrStages({
        paymentType: "deposit_cod",
        total: 1000,
        deposit: 300,
        received: 300,
      })
    ).toEqual([
      { stage: "deposit", label: "Deposit", amount: 0, status: "paid" },
      { stage: "balance", label: "Balance (COD)", amount: 700, status: "due" },
    ]);
  });

  it("marks both instalments paid when the ledger covers the total", () => {
    expect(
      paymentQrStages({
        paymentType: "deposit_cod",
        total: 1000,
        deposit: 300,
        received: 1000,
      })
    ).toEqual([
      { stage: "deposit", label: "Deposit", amount: 0, status: "paid" },
      { stage: "balance", label: "Balance (COD)", amount: 0, status: "paid" },
    ]);
  });

  // Bad data must not produce a negative QR amount.
  it("never encodes a negative balance when the deposit exceeds the total", () => {
    expect(
      paymentQrStages({
        paymentType: "deposit_cod",
        total: 200,
        deposit: 300,
        received: 0,
      })
    ).toEqual([
      { stage: "deposit", label: "Deposit", amount: 300, status: "due" },
      { stage: "balance", label: "Balance (COD)", amount: 0, status: "paid" },
    ]);
  });

  // A reversal is a negative receipt, so it raises what is still due.
  it("raises the amount due after a reversal lowers the ledger balance", () => {
    expect(
      paymentQrStages({ paymentType: "full", total: 1000, deposit: 0, received: 1000 })
    ).toEqual([{ stage: "full", label: "Full payment", amount: 0, status: "paid" }]);
    expect(
      paymentQrStages({ paymentType: "full", total: 1000, deposit: 0, received: 600 })
    ).toEqual([
      { stage: "full", label: "Full payment", amount: 400, status: "due" },
    ]);
  });

  it("rejects amounts that are not safe integers", () => {
    expect(() =>
      paymentQrStages({ paymentType: "full", total: 1000.5, deposit: 0, received: 0 })
    ).toThrow("Invalid payment amount");
  });
});
