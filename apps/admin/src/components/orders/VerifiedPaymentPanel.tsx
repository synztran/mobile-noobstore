"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BadgeCheck,
  CircleCheck,
  CircleDollarSign,
  Clock3,
  Hash,
  History,
  Landmark,
  Loader2,
  ReceiptText,
  ShieldCheck,
  StickyNote,
  TriangleAlert,
  Truck,
  Undo2,
  UserCheck,
  Wallet,
} from "lucide-react";
import { useState, type ComponentType } from "react";
import { adminQueryKeys } from "@/lib/react-query/root";
import { isAwaitingPayment } from "@/lib/order-status";

interface Receipt {
  id: string;
  amount: number;
  method: string;
  transaction_reference: string | null;
  received_at: string;
  verified_at: string;
  verified_by: string | null;
  note: string;
  reversal_of: string | null;
}
interface Bank {
  id: string;
  platform_name: string;
  account_number: string;
  account_name: string;
}
const money = (value: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
    value
  );

function dateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("vi-VN");
}

function currentLocalDateTime() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function generateTransactionReference() {
  const timestamp = new Date()
    .toISOString()
    .replace(/[-:TZ.]/g, "")
    .slice(0, 14);
  const suffix = crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase();
  return `MANUAL-${timestamp}-${suffix}`;
}

interface MethodMeta {
  label: string;
  icon: ComponentType<{ className?: string }>;
  bubble: string;
}

const METHOD_META: Record<string, MethodMeta> = {
  bank: {
    label: "Bank transfer",
    icon: Landmark,
    bubble: "border-blue-200 bg-blue-50 text-blue-700",
  },
  cash: {
    label: "Cash at store",
    icon: Wallet,
    bubble: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  cod: {
    label: "COD reconciled",
    icon: Truck,
    bubble: "border-amber-200 bg-amber-50 text-amber-700",
  },
  legacy: {
    label: "Legacy balance — not independently verified",
    icon: History,
    bubble: "border-slate-200 bg-slate-100 text-slate-600",
  },
  reversal: {
    label: "Reversal entry",
    icon: Undo2,
    bubble: "border-rose-200 bg-rose-50 text-rose-700",
  },
};

interface Props {
  orderId: string;
  total: number;
  status: string;
  paymentType?: "full" | "deposit_cod" | null;
  paidAt?: string | null;
  onUpdated: () => void;
}

export function VerifiedPaymentPanel({
  orderId,
  total,
  status,
  paymentType,
  paidAt,
  onUpdated,
}: Props) {
  const client = useQueryClient();
  const [method, setMethod] = useState("bank");
  const [amount, setAmount] = useState("");
  const [bankId, setBankId] = useState("");
  const [reference, setReference] = useState("");
  const [receivedAt, setReceivedAt] = useState(currentLocalDateTime);
  const [note, setNote] = useState("");
  const [verified, setVerified] = useState(false);
  const [reversalOf, setReversalOf] = useState("");
  const query = useQuery<{ receipts: Receipt[]; banks: Bank[] }>({
    queryKey: ["verified-receipts", orderId],
    queryFn: async () => {
      const res = await fetch(`/api/orders/${orderId}/payments`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Không thể tải sổ thanh toán");
      return res.json();
    },
  });
  const evidenceQuery = useQuery<{
    evidence: {
      id: string;
      version: number;
      amount: number;
      created_at: string;
      png_sha256: string;
    }[];
  }>({
    queryKey: ["payment-evidence", orderId],
    queryFn: async () => {
      const response = await fetch(`/api/orders/${orderId}/payment-evidence`, {
        cache: "no-store",
      });
      if (!response.ok) throw new Error("Không thể tải bằng chứng QR");
      return response.json();
    },
    refetchInterval: 30000,
  });
  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/orders/${orderId}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method,
          amount: Number(amount),
          bankId,
          reference,
          receivedAt: receivedAt ? new Date(receivedAt).toISOString() : null,
          note,
          verified,
          reversalOf: reversalOf || null,
        }),
      });
      const json = await res.json();
      if (!res.ok)
        throw new Error(json.error ?? "Không thể ghi nhận thanh toán");
      return json;
    },
    onSuccess: async () => {
      setVerified(false);
      setAmount("");
      setReference("");
      setReceivedAt(currentLocalDateTime());
      setNote("");
      setReversalOf("");
      await Promise.all([
        client.invalidateQueries({ queryKey: ["verified-receipts", orderId] }),
        client.invalidateQueries({
          queryKey: adminQueryKeys.orderDetail(orderId),
        }),
        client.invalidateQueries({ queryKey: ["orders"] }),
      ]);
      onUpdated();
    },
  });
  if (query.isPending)
    return (
      <div
        className="skeleton h-32 w-full rounded-xl"
        aria-label="Loading payment ledger"
      />
    );
  if (query.isError)
    return (
      <div
        role="alert"
        className="flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
      >
        <span>Could not load the payment ledger.</span>
        <button
          type="button"
          className="btn-soft shrink-0"
          onClick={() => query.refetch()}
        >
          Retry
        </button>
      </div>
    );

  const { receipts, banks } = query.data;
  const canRecord = isAwaitingPayment({ status, paymentType, paidAt });
  // A refunded/cancelled/returning order keeps its ledger for reference, but
  // "outstanding" no longer describes anything the operator can act on.
  const showBalance = !["refunded", "cancelled", "returning"].includes(status);
  const collected = receipts.reduce(
    (sum, receipt) => sum + Number(receipt.amount),
    0
  );
  const outstanding = Math.max(0, total - collected);
  const overpaid = collected > total;
  const covered = collected >= total;
  const statusLabel = overpaid ? "Overpaid" : covered ? "Covered" : "Partial";
  const StatusIcon = overpaid ? TriangleAlert : covered ? CircleCheck : Clock3;
  const statusTone = overpaid
    ? "text-amber-700"
    : covered
      ? "text-emerald-700"
      : "text-slate-900";
  const reversedIds = new Set(
    receipts
      .filter((receipt) => receipt.reversal_of)
      .map((receipt) => receipt.reversal_of)
  );
  const reversedReceipt = reversalOf
    ? (receipts.find((receipt) => receipt.id === reversalOf) ?? null)
    : null;

  return (
    <section
      aria-label="Payment verification"
      className="rounded-xl border border-slate-200 bg-white"
    >
      <header className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3">
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700">
            <ShieldCheck className="h-4 w-4" />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-slate-800">
              Payment verification
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              {canRecord
                ? "Record money only after it lands in a store account."
                : "Read-only ledger — this order is no longer awaiting payment."}
            </p>
          </div>
        </div>
        {receipts.length > 0 && (
          <span className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-600">
            {receipts.length} {receipts.length === 1 ? "entry" : "entries"}
          </span>
        )}
      </header>

      <div className="grid gap-4 p-4 xl:grid-cols-12 xl:gap-6">
        {/* Payment verification — 7 of 12 columns */}
        <div className="space-y-4 xl:col-span-7">
          <div className={`grid gap-2 ${showBalance ? "sm:grid-cols-3" : ""}`}>
            <div className="rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2">
              <p className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                <CircleDollarSign className="h-3.5 w-3.5" />
                Recorded
              </p>
              <p className="mt-1 text-sm font-semibold tabular-nums text-slate-900">
                {money(collected)}
              </p>
            </div>
            {showBalance && (
              <>
                <div className="rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2">
                  <p className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                    <Wallet className="h-3.5 w-3.5" />
                    Outstanding
                  </p>
                  <p
                    className={`mt-1 text-sm font-semibold tabular-nums ${outstanding > 0 ? "text-amber-700" : "text-slate-900"}`}
                  >
                    {money(outstanding)}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2">
                  <p className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                    <StatusIcon className="h-3.5 w-3.5" />
                    Status
                  </p>
                  <p className={`mt-1 text-sm font-semibold ${statusTone}`}>
                    {statusLabel}
                  </p>
                </div>
              </>
            )}
          </div>

          {canRecord && (
            <>
              {overpaid && (
                <p
                  role="status"
                  className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800"
                >
                  <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    Overpaid by {money(collected - total)} — needs separate
                    review.
                  </span>
                </p>
              )}
              <p className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  Chỉ ghi nhận sau khi kiểm tra tiền thực vào tài khoản cửa hàng
                  hoặc tiền mặt/COD đã thu. Không dùng ảnh khách gửi làm bằng
                  chứng.
                </span>
              </p>

              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!mutation.isPending) mutation.mutate();
                }}
              >
                <fieldset disabled={mutation.isPending} className="space-y-3">
                  {reversalOf && (
                    <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                      <p className="flex items-center gap-1.5 font-semibold">
                        <Undo2 className="h-3.5 w-3.5" />
                        Adjusting a recorded receipt
                      </p>
                      <p className="mt-1">
                        A negative entry reverses{" "}
                        {reversedReceipt
                          ? `${money(Number(reversedReceipt.amount))} · ${reversedReceipt.transaction_reference ?? "no reference"}`
                          : "the selected receipt"}
                        . The original stays in the ledger.
                      </p>
                    </div>
                  )}

                  {/* Split 7/5: the form column stays wide enough for two
                      short fields per row. */}
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block">
                      <span className="mb-1 block text-[11px] font-medium text-slate-500">
                        Payment type
                      </span>
                      <select
                        className="input-base w-full px-3 py-2 text-sm"
                        value={method}
                        onChange={(e) => {
                          setMethod(e.target.value);
                          setVerified(false);
                        }}
                      >
                        <option value="bank">Bank transfer</option>
                        <option value="cash">Cash at store</option>
                        <option value="cod">COD reconciled</option>
                      </select>
                    </label>

                    {!reversalOf && (
                      <label className="block">
                        <span className="mb-1 block text-[11px] font-medium text-slate-500">
                          Amount received (VND)
                        </span>
                        <div className="relative">
                          <input
                            className="input-base w-full px-3 py-2 pr-7 text-sm tabular-nums"
                            type="number"
                            min="1"
                            step="1"
                            required
                            value={amount}
                            onChange={(e) => {
                              setAmount(e.target.value);
                              setVerified(false);
                            }}
                          />
                          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-slate-400">
                            ₫
                          </span>
                        </div>
                      </label>
                    )}

                    {!reversalOf && method === "bank" && (
                      <label className="block sm:col-span-2">
                        <span className="mb-1 block text-[11px] font-medium text-slate-500">
                          Receiving account
                        </span>
                        <select
                          required
                          className="input-base w-full px-3 py-2 text-sm"
                          value={bankId}
                          onChange={(e) => {
                            setBankId(e.target.value);
                            setVerified(false);
                          }}
                        >
                          <option value="">Select an account</option>
                          {banks.map((bank) => (
                            <option key={bank.id} value={bank.id}>
                              {bank.platform_name} · {bank.account_number} ·{" "}
                              {bank.account_name}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}

                    {!reversalOf && (
                      <label className="block">
                        <span className="mb-1 block text-[11px] font-medium text-slate-500">
                          Transaction / receipt reference
                        </span>
                        <div className="flex gap-2">
                          <input
                            required
                            minLength={3}
                            maxLength={100}
                            placeholder="Bank statement, cash receipt, or COD settlement"
                            className="input-base min-w-0 flex-1 px-3 py-2 font-mono text-sm placeholder:font-sans placeholder:text-slate-400"
                            value={reference}
                            onChange={(e) => {
                              setReference(e.target.value);
                              setVerified(false);
                            }}
                          />
                          <button
                            type="button"
                            className="btn-soft shrink-0 px-3 text-xs"
                            onClick={() => {
                              setReference(generateTransactionReference());
                              setVerified(false);
                            }}
                          >
                            Generate
                          </button>
                        </div>
                      </label>
                    )}

                    <label className="block">
                      <span className="mb-1 block text-[11px] font-medium text-slate-500">
                        Received at
                      </span>
                        <input
                          required
                          type="datetime-local"
                        className="input-base w-full px-3 py-2 text-sm"
                        value={receivedAt}
                        onChange={(e) => {
                          setReceivedAt(e.target.value);
                          setVerified(false);
                        }}
                      />
                    </label>

                    <label className="block sm:col-span-2">
                      <span className="mb-1 flex items-baseline justify-between gap-2 text-[11px] font-medium text-slate-500">
                        <span>
                          {reversalOf
                            ? "Reversal reason (at least 10 characters)"
                            : "Note"}
                        </span>
                        <span className="tabular-nums text-slate-400">
                          {note.length}/1000
                        </span>
                      </span>
                      <textarea
                        rows={2}
                        className="input-base w-full px-3 py-2 text-sm"
                        required={!!reversalOf}
                        minLength={reversalOf ? 10 : undefined}
                        maxLength={1000}
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                      />
                    </label>
                  </div>

                  <label className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50/60 p-3 text-xs leading-relaxed text-slate-600">
                    <input
                      type="checkbox"
                      className="checkbox checkbox-sm mt-0.5 shrink-0"
                      checked={verified}
                      onChange={(e) => setVerified(e.target.checked)}
                      required
                    />
                    <span>
                      {reversalOf
                        ? "Tôi đã kiểm tra và xác nhận cần hủy ghi nhận này. Lịch sử gốc được giữ lại."
                        : "Tôi đã đối chiếu đúng người nhận, mã đơn, mã giao dịch và số tiền thực nhận qua nguồn của cửa hàng."}
                    </span>
                  </label>

                  <button
                    className="btn-primary w-full justify-center py-2"
                    disabled={!verified || mutation.isPending}
                    type="submit"
                  >
                    {mutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : reversalOf ? (
                      <Undo2 className="h-4 w-4" />
                    ) : (
                      <ShieldCheck className="h-4 w-4" />
                    )}
                    {mutation.isPending
                      ? "Recording…"
                      : reversalOf
                        ? "Record reversal entry"
                        : "Record verified payment"}
                  </button>
                  {reversalOf && (
                    <button
                      className="btn-ghost w-full justify-center"
                      type="button"
                      onClick={() => {
                        setReversalOf("");
                        setVerified(false);
                      }}
                    >
                      Cancel adjustment
                    </button>
                  )}
                </fieldset>
                {mutation.isError && (
                  <p
                    role="alert"
                    className="mt-3 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700"
                  >
                    <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>{mutation.error.message}</span>
                  </p>
                )}
              </form>
            </>
          )}
        </div>

        {/* Receipt history + issued QR — 5 of 12 columns */}
        <div className="space-y-4 border-t border-slate-100 pt-4 xl:col-span-5 xl:border-l xl:border-t-0 xl:pl-6 xl:pt-0">
          <div>
            <h4 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-700">
              <History className="h-4 w-4" />
              Receipt history
            </h4>
            {!receipts.length && (
              <div className="flex items-start gap-2 rounded-lg border border-dashed border-slate-200 bg-slate-50/60 p-3 text-xs text-slate-500">
                <ReceiptText className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                <p>
                  No payments recorded yet. Multiple transfers for one order are
                  allowed.
                </p>
              </div>
            )}
            {receipts.length > 0 && (
              <ul className="divide-y divide-slate-100">
                {receipts.map((receipt) => {
                  const meta = METHOD_META[receipt.method] ?? {
                    label: receipt.method,
                    icon: ReceiptText,
                    bubble: "border-slate-200 bg-slate-50 text-slate-600",
                  };
                  const Icon = meta.icon;
                  const reversed = reversedIds.has(receipt.id);
                  const receiptAmount = Number(receipt.amount);
                  return (
                    <li
                      key={receipt.id}
                      className={`flex items-start gap-3 py-3 ${reversed ? "opacity-60" : ""}`}
                    >
                      <span
                        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${meta.bubble}`}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-sm font-medium text-slate-800">
                              {meta.label}
                            </span>
                            {reversed && (
                              <span className="rounded-full border border-rose-200 bg-rose-50 px-1.5 py-0.5 text-[10px] font-medium text-rose-700">
                                Reversed
                              </span>
                            )}
                          </div>
                          <span
                            className={`shrink-0 font-mono text-sm font-semibold tabular-nums ${receiptAmount < 0 ? "text-rose-600" : "text-slate-900"}`}
                          >
                            {receiptAmount < 0
                              ? `−${money(Math.abs(receiptAmount))}`
                              : money(receiptAmount)}
                          </span>
                        </div>

                        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
                          {receipt.transaction_reference && (
                            <span
                              className="inline-flex min-w-0 max-w-full items-center gap-1"
                              title={receipt.transaction_reference}
                            >
                              <Hash className="h-3 w-3 shrink-0" />
                              <span className="min-w-0 truncate font-mono text-slate-600">
                                {receipt.transaction_reference}
                              </span>
                            </span>
                          )}
                          <span className="inline-flex items-center gap-1">
                            <Clock3 className="h-3 w-3 shrink-0" />
                            {dateTime(receipt.received_at)}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <UserCheck className="h-3 w-3 shrink-0" />
                            Verified by{" "}
                            <span
                              className="font-mono"
                              title={receipt.verified_by ?? undefined}
                            >
                              {receipt.verified_by
                                ? receipt.verified_by.slice(0, 8)
                                : "legacy data"}
                            </span>
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <BadgeCheck className="h-3 w-3 shrink-0" />
                            {dateTime(receipt.verified_at)}
                          </span>
                        </div>

                        {receipt.note && (
                          <p className="mt-1.5 flex items-start gap-1.5 text-xs italic text-slate-500">
                            <StickyNote className="mt-0.5 h-3 w-3 shrink-0" />
                            <span className="break-words">{receipt.note}</span>
                          </p>
                        )}

                        {canRecord && !reversed && receiptAmount > 0 && (
                          <div className="mt-2 flex justify-end">
                            <button
                              type="button"
                              className="btn-ghost px-2 py-1 text-[11px]"
                              onClick={() => {
                                setReversalOf(receipt.id);
                                setVerified(false);
                                setNote("");
                              }}
                            >
                              <Undo2 className="h-3 w-3" />
                              Reverse entry
                            </button>
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="space-y-2 border-t border-slate-100 pt-4">
            <h4 className="font-medium">QR cửa hàng đã phát hành</h4>
            <p className="text-sm">
              Chứng minh nội dung máy chủ phát hành, không chứng minh khách đã
              xem hoặc đã chuyển tiền.
            </p>
            {evidenceQuery.isPending && (
              <div className="skeleton h-12 w-full" />
            )}
            {evidenceQuery.isError && (
              <p role="alert">
                Chưa tải được lịch sử QR.{" "}
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => evidenceQuery.refetch()}
                >
                  Thử lại
                </button>
              </p>
            )}
            {evidenceQuery.data?.evidence.length === 0 && (
              <p className="text-sm">Chưa phát hành QR được lưu trữ.</p>
            )}
            <ul className="space-y-2 text-sm">
              {evidenceQuery.data?.evidence.map((item) => (
                <li key={item.id} className="break-all">
                  <a
                    className="link"
                    href={`/api/orders/${orderId}/payment-evidence?evidence=${item.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Tải QR phiên bản {item.version} · {money(item.amount)}
                  </a>
                  <p>
                    {dateTime(item.created_at)} · SHA-256: {item.png_sha256}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
