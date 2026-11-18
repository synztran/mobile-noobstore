/**
 * Payment QR stages for the admin re-provision panel.
 *
 * Amounts come from the stored order totals and the verified receipt ledger —
 * never from `remaining_amount`, which migration 158 explicitly does not
 * recalculate. A reversal is a negative receipt, so it increases what is due.
 *
 * A full-payment order has one payable stage. A deposit order always has two:
 * the deposit and the COD balance. The balance is `after_deposit` until the
 * deposit is covered, because collecting it first leaves the deposit short.
 */

export type PaymentQrStageKey = "full" | "deposit" | "balance";
export type PaymentQrStageStatus = "due" | "paid" | "after_deposit";

export interface PaymentQrStage {
  stage: PaymentQrStageKey;
  label: string;
  amount: number;
  status: PaymentQrStageStatus;
}

export function paymentQrStages({
  paymentType,
  total,
  deposit,
  depositPercentage,
  received,
}: {
  paymentType?: string | null;
  total: number;
  deposit: number;
  depositPercentage?: number | null;
  received: number;
}): PaymentQrStage[] {
  if (![total, deposit, received].every(Number.isSafeInteger)) {
    throw new Error("Invalid payment amount");
  }

  if (paymentType !== "deposit_cod") {
    const amount = Math.max(0, total - received);
    return [
      {
        stage: "full",
        label: "Full payment",
        amount,
        status: amount > 0 ? "due" : "paid",
      },
    ];
  }

  const depositDue = Math.max(0, deposit - received);
  const balanceDue = Math.max(0, total - Math.max(received, deposit));
  const percentage = Number(depositPercentage ?? 0);
  return [
    {
      stage: "deposit",
      label: percentage > 0 ? `Deposit (${percentage}%)` : "Deposit",
      amount: depositDue,
      status: depositDue > 0 ? "due" : "paid",
    },
    {
      stage: "balance",
      label: "Balance (COD)",
      amount: balanceDue,
      status:
        balanceDue === 0
          ? "paid"
          : received >= deposit
            ? "due"
            : "after_deposit",
    },
  ];
}
