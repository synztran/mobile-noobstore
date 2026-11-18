"use client";

import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Link2,
  Save,
  Truck,
} from "lucide-react";
import { useState } from "react";

export interface CarrierValues {
  id: string;
  name: string | null;
  logo: string | null;
  tracking_url_template: string | null;
  is_active: boolean;
  sort_order: number;
}

interface Props {
  initial: CarrierValues[];
  loadError?: string | null;
}

const SAMPLE_TRACKING_NUMBER = "GHN123456789";

const sectionHeading =
  "flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted";

/** Mirrors the customer-side buildTrackingUrl in apps/web/src/lib/tracking.ts. */
function previewUrl(template: string): string | null {
  const trimmed = template.trim();
  if (!trimmed || !trimmed.includes("{tracking_number}")) return null;
  return trimmed.replace("{tracking_number}", SAMPLE_TRACKING_NUMBER);
}

function CarriersForm({ initial, loadError }: Props) {
  const [rows, setRows] = useState<CarrierValues[]>(initial);
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const patch = (id: string, next: Partial<CarrierValues>) => {
    setSaved((prev) => ({ ...prev, [id]: false }));
    setError(null);
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...next } : r))
    );
  };

  const handleSave = async (row: CarrierValues) => {
    setSavingId(row.id);
    setError(null);
    try {
      const res = await fetch("/api/carriers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: row.id,
          name: row.name ?? "",
          logo: row.logo,
          tracking_url_template: row.tracking_url_template,
          is_active: row.is_active,
          sort_order: row.sort_order,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to save carrier");
      setRows((prev) => prev.map((r) => (r.id === row.id ? json.carrier : r)));
      setSaved((prev) => ({ ...prev, [row.id]: true }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save carrier");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="card-panel overflow-hidden">
      <div className="p-6 sm:p-8">
        <h2 className={sectionHeading}>
          <Truck className="h-3.5 w-3.5" aria-hidden="true" />
          Carriers &amp; tracking links
        </h2>
        <p className="mt-2 max-w-2xl text-[13px] text-muted">
          Staff pick one of these when fulfilling a courier order. If the
          tracking URL contains{" "}
          <code className="font-mono text-[12px]">{ "{tracking_number}" }</code>{" "}
          the customer gets a &ldquo;Theo dõi&rdquo; link that opens the
          carrier&rsquo;s own tracking page with their tracking number filled in.
          Leave it empty for carriers with no public tracking page — the customer
          then sees the carrier name and a copyable tracking number.
        </p>
      </div>

      {loadError && (
        <div className="px-6 pb-4 sm:px-8">
          <p className="flex items-center gap-1.5 text-[13px] text-rose-600">
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="truncate">Could not load carriers: {loadError}</span>
          </p>
        </div>
      )}

      <div className="table-divide divide-y">
        {rows.map((row) => {
          const preview = row.tracking_url_template
            ? previewUrl(row.tracking_url_template)
            : null;
          const hasPlaceholder = (row.tracking_url_template ?? "").includes(
            "{tracking_number}"
          );

          return (
            <div key={row.id} className="space-y-3 p-6 sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[12px] text-muted">
                    {row.id}
                  </span>
                  <Link2 className="h-3.5 w-3.5 text-muted" aria-hidden="true" />
                  <span className="text-sm font-semibold text-heading">
                    {row.name}
                  </span>
                </div>
                <label className="flex cursor-pointer items-center gap-2 text-[13px] text-muted">
                  <input
                    type="checkbox"
                    checked={row.is_active}
                    onChange={(e) =>
                      patch(row.id, { is_active: e.target.checked })
                    }
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  Active
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-start">
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-700">
                    Tracking URL template
                  </label>
                  <input
                    type="url"
                    inputMode="url"
                    value={row.tracking_url_template ?? ""}
                    onChange={(e) =>
                      patch(row.id, { tracking_url_template: e.target.value })
                    }
                    placeholder={`https://carrier.example/track?code={tracking_number}`}
                    className="input-base w-full rounded-lg px-3 py-2 font-mono text-sm placeholder:text-slate-400"
                  />
                  {row.tracking_url_template && !hasPlaceholder && (
                    <p className="text-[12px] text-amber-600">
                      Missing{" "}
                      <code className="font-mono">{ "{tracking_number}" }</code>{" "}
                      — the customer link would always open the same page.
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 sm:pt-7">
                  {preview ? (
                    <a
                      href={preview}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 whitespace-nowrap text-[13px] text-[rgb(var(--admin-accent))] underline underline-offset-2"
                    >
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                      Preview
                    </a>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => handleSave(row)}
                    disabled={savingId === row.id}
                    className="btn-primary inline-flex h-9 items-center gap-1.5 whitespace-nowrap px-4 disabled:opacity-50"
                  >
                    {savingId === row.id ? (
                      <>
                        <span className="loading loading-spinner loading-sm" />
                        Saving
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" aria-hidden="true" />
                        Save
                      </>
                    )}
                  </button>
                </div>
              </div>

              {saved[row.id] && (
                <p className="flex items-center gap-1.5 text-[12px] text-emerald-600">
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                  Saved
                </p>
              )}
            </div>
          );
        })}
      </div>

      {error && (
        <div className="border-t border-[rgb(var(--admin-border))] px-6 py-4 sm:px-8">
          <p role="alert" className="flex items-center gap-1.5 text-[13px] text-rose-600">
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="truncate">{error}</span>
          </p>
        </div>
      )}
    </div>
  );
}

export default CarriersForm;
