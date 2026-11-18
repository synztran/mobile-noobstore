"use client";

import { ExternalLink, Link2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { OrderDetail } from "./OrderDetailModal";
import { isCarrierShippingMethod } from "@/lib/shipping-method";
import { buildTrackingUrl } from "@web-tracking";

interface Carrier {
  id: string;
  name: string | null;
  logo: string | null;
  tracking_url_template: string | null;
  is_active?: boolean;
  sort_order?: number;
}

interface Props {
  order: OrderDetail;
  onUpdated: () => void;
}

function parseFeeInput(raw: string): number | null | undefined {
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  const n = Number(trimmed);
  // undefined = invalid input; the save button stays disabled in that case.
  if (!Number.isFinite(n) || n < 0) return undefined;
  return Math.round(n);
}

export default function ShippingTrackingSection({
  order,
  onUpdated,
}: Props) {
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [carrierId, setCarrierId] = useState<string>(
    order.tracking_carrier_id ?? ""
  );
  const [trackingNumber, setTrackingNumber] = useState<string>(
    order.tracking_number ?? ""
  );
  // Courier tiers are ordered unquoted (shipping_fee 0), so this is where the
  // real BE / Grab / Green SM amount gets entered once the parcel is booked.
  const [feeInput, setFeeInput] = useState<string>(
    order.shipping_fee === null ? "" : String(order.shipping_fee)
  );
  const [saving, setSaving] = useState(false);
  const [loadingCarriers, setLoadingCarriers] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/carriers");
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Failed to load carriers");
        // The endpoint returns every carrier (the /fees editor needs inactive
        // ones too) — only active carriers belong in this dropdown.
        if (!cancelled)
          setCarriers(
            (json.carriers ?? []).filter((c: Carrier) => c.is_active !== false)
          );
      } catch (e) {
        if (!cancelled)
          setLoadError(
            e instanceof Error ? e.message : "Failed to load carriers"
          );
      } finally {
        if (!cancelled) setLoadingCarriers(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setCarrierId(order.tracking_carrier_id ?? "");
    setTrackingNumber(order.tracking_number ?? "");
    setFeeInput(order.shipping_fee === null ? "" : String(order.shipping_fee));
  }, [order.tracking_carrier_id, order.tracking_number, order.shipping_fee]);

  const selectedCarrier = useMemo(
    () => carriers.find((c) => c.id === carrierId) ?? null,
    [carriers, carrierId]
  );

  // All courier tiers (in-city and inter-city) are handed off to a carrier, so
  // the tracking editor applies to every one of them.
  const isCarrierMethod =
    isCarrierShippingMethod(order.shipping_method_id);

  if (!isCarrierMethod) return null;

  // A settled order keeps the total it was paid against — the server rejects
  // the write, so surface it here instead of letting the operator hit an error.
  const isSettled =
    order.status === "cancelled" || order.status === "refunded";

  const parsedFee = parseFeeInput(feeInput);
  const feeInvalid = parsedFee === undefined;
  const feeChanged =
    parsedFee !== undefined &&
    parsedFee !== (order.shipping_fee ?? 0);

  const dirty =
    carrierId !== (order.tracking_carrier_id ?? "") ||
    trackingNumber !== (order.tracking_number ?? "") ||
    feeChanged;

  const handleSave = async () => {
    if (parsedFee === undefined) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tracking_carrier_id: carrierId || null,
          tracking_number: trackingNumber.trim() || null,
          shipping_fee: parsedFee,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Update failed");
      onUpdated();
    } catch (e) {
      console.error("[ShippingTracking] update failed:", e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      data-testid="shipping-tracking-section"
      className="w-full rounded-lg border border-emerald-200 bg-emerald-50/60 p-3"
    >
      <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-emerald-800">
        <Link2 className="h-3.5 w-3.5" />
        Shipment Tracking
      </p>

      {loadError && (
        <p className="mb-2 text-xs text-rose-600">
          Could not load carriers: {loadError}
        </p>
      )}

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-[11px] font-medium text-slate-500">
            Carrier
          </label>
          <select
            value={carrierId}
            onChange={(e) => setCarrierId(e.target.value)}
            disabled={loadingCarriers || isSettled}
            className="input-base w-full rounded-lg px-3 py-2 text-sm disabled:opacity-50"
          >
            <option value="">— Select carrier —</option>
            {carriers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name ?? c.id}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-medium text-slate-500">
            Tracking number
          </label>
          <input
            type="text"
            value={trackingNumber}
            onChange={(e) => setTrackingNumber(e.target.value)}
            disabled={isSettled}
            placeholder="e.g. GVJH123456789"
            className="input-base w-full rounded-lg px-3 py-2 font-mono text-sm placeholder:text-slate-400 disabled:opacity-50"
          />
        </div>
      </div>

      {/* Courier rate is not knowable at checkout, so it is entered here. */}
      <div className="mt-2">
        <label className="mb-1 block text-[11px] font-medium text-slate-500">
          Delivery fee
        </label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            inputMode="numeric"
            min={0}
            value={feeInput}
            onChange={(e) => setFeeInput(e.target.value)}
            disabled={isSettled}
            placeholder="Cập nhật sau"
            className="input-base w-full rounded-lg px-3 py-2 text-sm placeholder:text-slate-400 disabled:opacity-50"
          />
          <span className="shrink-0 text-xs text-slate-500">₫</span>
        </div>
        <p className="mt-1 text-[11px] text-slate-500">
          {isSettled
            ? `Locked — the order is ${order.status}.`
            : "Quoted by the courier. Saving adds this to the order total and emails the customer."}
        </p>
        {feeInvalid && (
          <p className="mt-1 text-[11px] text-rose-600">
            Enter a non-negative number, or leave blank to keep the fee
            unquoted.
          </p>
        )}
      </div>

      {selectedCarrier && trackingNumber && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-emerald-700">
          <ExternalLink className="h-3.5 w-3.5" />
          <a
            href={
              buildTrackingUrl(
                selectedCarrier.tracking_url_template,
                trackingNumber
              ) ?? "#"
            }
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-emerald-900"
          >
            Open carrier tracking page
          </a>
        </p>
      )}

      {dirty && !isSettled && (
        <div className="mt-2 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving || feeInvalid}
            className="btn btn-sm btn-primary disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save shipping"}
          </button>
        </div>
      )}
    </div>
  );
}