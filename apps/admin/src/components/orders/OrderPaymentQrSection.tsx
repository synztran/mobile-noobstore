"use client";

import { useQuery } from "@tanstack/react-query";
import {
  CheckCircle2,
  Clock3,
  Download,
  Landmark,
  QrCode,
  RefreshCw,
  TriangleAlert,
} from "lucide-react";
import CopyToClipboardButton from "@/components/products/CopyToClipboardButton";
import { formatVND } from "@/lib/currency";

type StageKey = "full" | "deposit" | "balance";
type StageStatus = "due" | "paid" | "after_deposit";

interface PaymentQrStage {
  stage: StageKey;
  label: string;
  amount: number;
  status: StageStatus;
  qrPng: string | null;
}

interface PaymentQrResponse {
  active: boolean;
  orderNumber: string;
  reference: string;
  bank: {
    platform_name: string;
    account_number: string;
    account_name: string;
    bank_logo_url: string | null;
  } | null;
  stages: PaymentQrStage[];
}

const STATUS_META: Record<
  StageStatus,
  { label: string; chip: string; hint: string | null }
> = {
  due: {
    label: "Collect now",
    chip: "border-amber-200 bg-amber-50 text-amber-700",
    hint: null,
  },
  paid: {
    label: "Paid",
    chip: "border-emerald-200 bg-emerald-50 text-emerald-700",
    hint: null,
  },
  after_deposit: {
    label: "After deposit",
    chip: "border-slate-200 bg-slate-100 text-slate-600",
    hint: "Collect the deposit first.",
  },
};

export default function OrderPaymentQrSection({
  orderId,
}: {
  orderId: string;
}) {
  const query = useQuery<PaymentQrResponse>({
    queryKey: ["order-payment-qr", orderId],
    queryFn: async () => {
      const res = await fetch(`/api/orders/${orderId}/payment-qr`, {
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Cannot load payment QR");
      return json;
    },
    staleTime: 0,
    refetchOnWindowFocus: false,
  });

  if (query.isPending) {
    return <div className="skeleton h-40 w-full rounded-xl" aria-label="Loading payment QR" />;
  }

  if (query.isError) {
    return (
      <div
        role="alert"
        className="flex items-start justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
      >
        <span className="flex items-start gap-2">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{query.error.message}</span>
        </span>
        <button
          type="button"
          className="btn-soft shrink-0"
          onClick={() => query.refetch()}
        >
          Retry
        </button>
      </div>
    );
  }

  const data = query.data;
  // A closed order has nothing to collect, and a settled order already reads as
  // covered in Price Summary — an empty panel would only add noise.
  if (!data.active || !data.bank) return null;
  if (data.stages.every((stage) => stage.status === "paid")) return null;

  return (
    <section
      aria-label="Payment QR codes"
      className="rounded-xl border border-slate-200 bg-white"
    >
      <header className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3">
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-sky-200 bg-sky-50 text-sky-700">
            <QrCode className="h-4 w-4" />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Payment QR</h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Re-send the code if the customer lost theirs.
            </p>
          </div>
        </div>
        <button
          type="button"
          className="btn-ghost shrink-0 px-2 py-1"
          onClick={() => query.refetch()}
          disabled={query.isFetching}
          aria-label="Refresh payment QR"
          title="Refresh payment QR"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${query.isFetching ? "animate-spin" : ""}`}
          />
        </button>
      </header>

      <div className="space-y-4 p-4">
        <div className="flex items-start gap-2.5 rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2">
          <Landmark className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium text-slate-500">
              Receiving account
            </p>
            <p className="mt-0.5 truncate text-sm font-medium text-slate-800">
              {data.bank.platform_name}
              <span className="text-slate-400"> · </span>
              <span className="font-mono">{data.bank.account_number}</span>
            </p>
            <p className="truncate text-xs text-slate-500">
              {data.bank.account_name}
            </p>
          </div>
          <CopyToClipboardButton
            value={data.bank.account_number}
            label="Copy account number"
          />
        </div>

        <div className="space-y-3">
          {data.stages.map((stage) => {
            const meta = STATUS_META[stage.status];
            return (
              <article
                key={stage.stage}
                className="flex gap-3 rounded-lg border border-slate-200 bg-slate-50/60 p-3"
              >
                <div className="flex h-36 w-36 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white p-2">
                  {stage.qrPng ? (
                    // Base64 PNG is rendered locally by the server; no external
                    // image host and no customer-uploaded content is involved.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`data:image/png;base64,${stage.qrPng}`}
                      alt={`QRBanking ${stage.label} ${formatVND(stage.amount)}`}
                      className="h-full w-full object-contain"
                      width={144}
                      height={144}
                    />
                  ) : (
                    <span className="flex flex-col items-center gap-1 text-emerald-600">
                      <CheckCircle2 className="h-6 w-6" />
                      <span className="text-[11px] font-medium">Settled</span>
                    </span>
                  )}
                </div>

                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <h4 className="text-sm font-semibold text-slate-800">
                      {stage.label}
                    </h4>
                    <span
                      className={`rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${meta.chip}`}
                    >
                      {meta.label}
                    </span>
                  </div>

                  <p
                    className={`mt-1 font-mono text-base font-semibold tabular-nums ${
                      stage.amount > 0 ? "text-slate-900" : "text-slate-400"
                    }`}
                  >
                    {formatVND(stage.amount)}
                  </p>

                  <p className="mt-1 flex items-center gap-1 text-[11px] text-slate-500">
                    <Clock3 className="h-3 w-3 shrink-0" />
                    <span className="truncate">
                      Reference{" "}
                      <span className="font-mono text-slate-600">
                        {data.reference}
                      </span>
                    </span>
                    <CopyToClipboardButton
                      value={data.reference}
                      label="Copy transfer reference"
                    />
                  </p>

                  {meta.hint && (
                    <p className="mt-1 text-[11px] text-slate-500">{meta.hint}</p>
                  )}

                  <div className="mt-auto pt-2">
                    {stage.qrPng ? (
                      <a
                        href={`data:image/png;base64,${stage.qrPng}`}
                        download={`${data.orderNumber}-${stage.stage}.png`}
                        className="btn-soft w-full justify-center"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Download PNG
                      </a>
                    ) : (
                      <p className="flex items-center gap-1.5 text-[11px] text-slate-500">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        Nothing left to collect for this stage.
                      </p>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <p className="text-[11px] leading-relaxed text-slate-500">
          Amounts follow the verified receipt ledger. A QR only tells the
          customer where to pay — it is not proof of payment.
        </p>
      </div>
    </section>
  );
}
