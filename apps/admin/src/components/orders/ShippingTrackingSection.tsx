"use client";

import { ExternalLink, Link2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { OrderDetail } from "./OrderDetailModal";

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

function buildTrackingUrl(
  template: string | null | undefined,
  trackingNumber: string | null | undefined
): string | null {
  if (!template || !trackingNumber) return null;
  return template.replace("{tracking_number}", trackingNumber);
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
        if (!cancelled) setCarriers(json.carriers ?? []);
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
  }, [order.tracking_carrier_id, order.tracking_number]);

  const selectedCarrier = useMemo(
    () => carriers.find((c) => c.id === carrierId) ?? null,
    [carriers, carrierId]
  );

  const isDeliveryService =
    order.shipping_method_id === "delivery_service" ||
    order.shipping_method_id === "shipment";

  if (!isDeliveryService) return null;

  const dirty =
    carrierId !== (order.tracking_carrier_id ?? "") ||
    trackingNumber !== (order.tracking_number ?? "");

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tracking_carrier_id: carrierId || null,
          tracking_number: trackingNumber.trim() || null,
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
            disabled={loadingCarriers}
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
            placeholder="e.g. GVJH123456789"
            className="input-base w-full rounded-lg px-3 py-2 font-mono text-sm placeholder:text-slate-400"
          />
        </div>
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

      {dirty && (
        <div className="mt-2 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn btn-sm btn-primary disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save tracking"}
          </button>
        </div>
      )}
    </div>
  );
}