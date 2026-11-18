"use client";

import { ArrowRight, Check, X } from "lucide-react";
import { useMemo } from "react";

import type {
  DetectedKey,
  MatchResult,
  ReviewDecision,
  ReviewMap,
} from "@/lib/keycap-check/types";
import KeyThumb from "./KeyThumb";

interface MatchListsProps {
  match: MatchResult;
  renderKeys: DetectedKey[];
  customerKeys: DetectedKey[];
  renderCanvas: HTMLCanvasElement;
  customerCanvases: HTMLCanvasElement[];
  reviews: ReviewMap;
  onReview: (customerId: string, decision: ReviewDecision) => void;
}

function similarity(distance: number): number {
  if (!Number.isFinite(distance)) return 0;
  return Math.max(0, Math.min(100, Math.round((1 - distance) * 100)));
}

function captionForCustomer(key: DetectedKey): string {
  return `Khách #${key.imageIndex + 1} · ${key.sizeClass}${key.manual ? " · tay" : ""}`;
}

export default function MatchLists({
  match,
  renderKeys,
  customerKeys,
  renderCanvas,
  customerCanvases,
  reviews,
  onReview,
}: MatchListsProps) {
  const refById = useMemo(
    () => new Map(renderKeys.map((key) => [key.id, key])),
    [renderKeys],
  );
  const customerById = useMemo(
    () => new Map(customerKeys.map((key) => [key.id, key])),
    [customerKeys],
  );

  function sourceForCustomer(key: DetectedKey): HTMLCanvasElement | null {
    return customerCanvases[key.imageIndex] ?? null;
  }

  return (
    <div className="space-y-4">
      {match.uncertain.length > 0 && (
        <Section
          title="Cặp nghi ngờ"
          description="Độ giống nằm trong vùng chưa chắc chắn. Staff xem 2 crop và xác nhận trước khi in 100% MATCH."
          count={match.uncertain.length}
          tone="amber"
        >
          {match.uncertain.map((pair) => {
            const ref = refById.get(pair.refId);
            const customer = customerById.get(pair.customerId);
            if (!ref || !customer) return null;
            const decision = reviews[pair.customerId];

            return (
              <div
                key={pair.customerId}
                className="flex flex-wrap items-center gap-3 rounded-lg border border-amber-200 bg-white p-2"
              >
                <KeyThumb
                  source={renderCanvas}
                  item={ref}
                  caption={`Render · ${ref.sizeClass}`}
                  highlighted
                />
                <ArrowRight className="h-4 w-4 shrink-0 text-slate-400" />
                <KeyThumb
                  source={sourceForCustomer(customer)}
                  item={customer}
                  caption={captionForCustomer(customer)}
                  highlighted
                />
                <div className="min-w-[160px] flex-1">
                  <p className="text-[11px] text-slate-700">
                    Độ giống:{" "}
                    <span className="font-semibold tabular-nums">
                      {similarity(pair.distance)}%
                    </span>
                  </p>
                  <p className="mt-0.5 text-[10px] leading-relaxed text-slate-500">
                    Cùng size {ref.sizeClass}. Cần người xác nhận legend.
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onReview(pair.customerId, "confirmed")}
                    className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
                      decision === "confirmed"
                        ? "bg-emerald-600 text-white"
                        : "border border-emerald-300 bg-white text-emerald-700 hover:bg-emerald-50"
                    }`}
                  >
                    <Check className="h-3 w-3" />
                    Khớp
                  </button>
                  <button
                    type="button"
                    onClick={() => onReview(pair.customerId, "rejected")}
                    className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
                      decision === "rejected"
                        ? "bg-rose-600 text-white"
                        : "border border-rose-300 bg-white text-rose-700 hover:bg-rose-50"
                    }`}
                  >
                    <X className="h-3 w-3" />
                    Không khớp
                  </button>
                </div>
              </div>
            );
          })}
        </Section>
      )}

      <Section
        title="Thiếu"
        description="Render có nhưng không tìm thấy key tương ứng trong ảnh khách."
        count={match.missingIds.length}
        tone={match.missingIds.length > 0 ? "rose" : "slate"}
      >
        {match.missingIds.length === 0 ? (
          <Empty text="Không thiếu key nào." />
        ) : (
          <div className="flex flex-wrap gap-2">
            {match.missingIds.map((id) => {
              const key = refById.get(id);
              if (!key) return null;
              return (
                <KeyThumb
                  key={id}
                  source={renderCanvas}
                  item={key}
                  caption={`Render · ${key.sizeClass}`}
                />
              );
            })}
          </div>
        )}
      </Section>

      <Section
        title="Trùng"
        description="Khách gửi thêm key giống một key đã có trong render."
        count={match.duplicateIds.length}
        tone={match.duplicateIds.length > 0 ? "orange" : "slate"}
      >
        {match.duplicateIds.length === 0 ? (
          <Empty text="Không phát hiện key trùng." />
        ) : (
          <div className="space-y-2">
            {match.duplicateIds.map((id) => {
              const customer = customerById.get(id);
              if (!customer) return null;
              const nearestId = match.nearestRefByCustomer[id];
              const nearest = nearestId ? refById.get(nearestId) : undefined;
              const distance = match.distanceByCustomer[id] ?? Number.NaN;

              return (
                <div
                  key={id}
                  className="flex flex-wrap items-center gap-3 rounded-lg border border-orange-200 bg-white p-2"
                >
                  <KeyThumb
                    source={sourceForCustomer(customer)}
                    item={customer}
                    caption={captionForCustomer(customer)}
                    highlighted
                  />
                  {nearest && (
                    <>
                      <ArrowRight className="h-4 w-4 shrink-0 text-slate-400" />
                      <KeyThumb
                        source={renderCanvas}
                        item={nearest}
                        caption={`Giống render · ${nearest.sizeClass}`}
                      />
                    </>
                  )}
                  <p className="text-[11px] text-slate-600">
                    Độ giống:{" "}
                    <span className="font-semibold tabular-nums">
                      {similarity(distance)}%
                    </span>
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      <Section
        title="Dư / lạ"
        description="Key trong ảnh khách không khớp với bất kỳ key nào trong render."
        count={match.extraIds.length}
        tone={match.extraIds.length > 0 ? "rose" : "slate"}
      >
        {match.extraIds.length === 0 ? (
          <Empty text="Không có key dư." />
        ) : (
          <div className="flex flex-wrap gap-2">
            {match.extraIds.map((id) => {
              const customer = customerById.get(id);
              if (!customer) return null;
              return (
                <KeyThumb
                  key={id}
                  source={sourceForCustomer(customer)}
                  item={customer}
                  caption={captionForCustomer(customer)}
                  highlighted
                />
              );
            })}
          </div>
        )}
      </Section>
    </div>
  );
}

function Section({
  title,
  description,
  count,
  tone,
  children,
}: {
  title: string;
  description: string;
  count: number;
  tone: "amber" | "rose" | "orange" | "slate";
  children: React.ReactNode;
}) {
  const toneClass =
    tone === "amber"
      ? "border-amber-200 bg-amber-50"
      : tone === "rose"
        ? "border-rose-200 bg-rose-50"
        : tone === "orange"
          ? "border-orange-200 bg-orange-50"
          : "border-slate-200 bg-white";

  return (
    <section className={`rounded-xl border p-3 shadow-sm ${toneClass}`}>
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <h3 className="text-xs font-semibold text-slate-900">
            {title}
            <span className="ml-1.5 rounded-full bg-white/80 px-1.5 py-0.5 text-[10px] tabular-nums text-slate-600 ring-1 ring-inset ring-slate-200">
              {count}
            </span>
          </h3>
          <p className="mt-0.5 text-[10px] leading-relaxed text-slate-500">
            {description}
          </p>
        </div>
      </div>
      {children}
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-[11px] text-slate-500">{text}</p>;
}
