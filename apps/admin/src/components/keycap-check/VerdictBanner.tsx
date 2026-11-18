"use client";

import { AlertTriangle, CheckCircle2, HelpCircle, Printer } from "lucide-react";

import type { Verdict } from "@/lib/keycap-check/types";
import { verdictDetail, verdictHeadline } from "@/lib/keycap-check/verdict";

interface VerdictBannerProps {
  verdict: Verdict;
  onPrint: () => void;
}

const STYLES = {
  match: {
    wrapper: "border-emerald-200 bg-emerald-50",
    icon: "text-emerald-600",
    title: "text-emerald-900",
    body: "text-emerald-800",
    badge: "bg-emerald-600 text-white",
  },
  review: {
    wrapper: "border-amber-200 bg-amber-50",
    icon: "text-amber-600",
    title: "text-amber-900",
    body: "text-amber-800",
    badge: "bg-amber-500 text-white",
  },
  incomplete: {
    wrapper: "border-rose-200 bg-rose-50",
    icon: "text-rose-600",
    title: "text-rose-900",
    body: "text-rose-800",
    badge: "bg-rose-600 text-white",
  },
} as const;

export default function VerdictBanner({ verdict, onPrint }: VerdictBannerProps) {
  const style = STYLES[verdict.status];
  const Icon =
    verdict.status === "match"
      ? CheckCircle2
      : verdict.status === "review"
        ? HelpCircle
        : AlertTriangle;

  return (
    <section className={`rounded-xl border p-4 shadow-sm ${style.wrapper}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <Icon className={`mt-0.5 h-6 w-6 shrink-0 ${style.icon}`} />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className={`text-lg font-bold tracking-tight ${style.title}`}>
                {verdictHeadline(verdict)}
              </h2>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${style.badge}`}>
                {verdict.status === "match"
                  ? "ĐÃ XÁC NHẬN"
                  : verdict.status === "review"
                    ? "CHỜ XÁC NHẬN"
                    : "KHÔNG KHỚP"}
              </span>
            </div>
            <p className={`mt-1 text-xs leading-relaxed ${style.body}`}>
              {verdictDetail(verdict)}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onPrint}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
        >
          <Printer className="h-3.5 w-3.5" />
          In kết quả
        </button>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        <Metric label="Render" value={verdict.totalReference} />
        <Metric label="Phát hiện" value={verdict.totalDetected} />
        <Metric label="Khớp" value={verdict.matched} tone="emerald" />
        <Metric label="Thiếu" value={verdict.missing} tone={verdict.missing > 0 ? "rose" : undefined} />
        <Metric
          label="Trùng"
          value={verdict.duplicates}
          tone={verdict.duplicates > 0 ? "orange" : undefined}
        />
        <Metric label="Dư/lạ" value={verdict.extras} tone={verdict.extras > 0 ? "rose" : undefined} />
        <Metric
          label="Nghi ngờ"
          value={verdict.uncertain}
          tone={verdict.uncertain > 0 ? "amber" : undefined}
        />
      </dl>
    </section>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "emerald" | "rose" | "orange" | "amber";
}) {
  const toneClass =
    tone === "emerald"
      ? "text-emerald-700"
      : tone === "rose"
        ? "text-rose-700"
        : tone === "orange"
          ? "text-orange-700"
          : tone === "amber"
            ? "text-amber-700"
            : "text-slate-800";

  return (
    <div className="rounded-lg bg-white/70 px-2.5 py-1.5 ring-1 ring-inset ring-white/60">
      <dt className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd className={`text-base font-semibold tabular-nums ${toneClass}`}>
        {value}
      </dd>
    </div>
  );
}
