"use client";

import { formatVND } from "@/lib/currency";
import NumberInput from "@/components/ui/NumberInput";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  AlertCircle,
  Calculator,
  CheckCircle2,
  PackageCheck,
  Save,
  SlidersHorizontal,
  Truck,
} from "lucide-react";

export interface FeeValues {
  delivery_immediate_price: number;
  delivery_basic_price: number;
  insurance_fee: number;
  packing_fee: number;
  handling_fee: number;
  max_vouchers_per_order: number;
}

interface FeesFormProps {
  initial: FeeValues;
}

type FeeKey = keyof FeeValues;

interface FeeField {
  key: FeeKey;
  label: string;
  hint: string;
}

const deliveryFields: FeeField[] = [
  { key: "delivery_basic_price", label: "Basic delivery", hint: "Phí giao cơ bản" },
  { key: "delivery_immediate_price", label: "Immediate delivery", hint: "Phí giao nhanh" },
];

// In-city courier tiers carry no configured price — see the note rendered in
// the "Carrier delivery" section.

const chargeFields: FeeField[] = [
  { key: "insurance_fee", label: "Insurance", hint: "Phí bảo hiểm" },
  { key: "packing_fee", label: "Packing", hint: "Phí đóng gói" },
  { key: "handling_fee", label: "Handling", hint: "Phí xử lý" },
];

const sectionHeading =
  "flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted";

export default function FeesForm({ initial }: FeesFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<FeeValues>(initial);
  const [lastSaved, setLastSaved] = useState<FeeValues>(initial);

  const dirty = (Object.keys(fields) as FeeKey[]).some(
    (key) => fields[key] !== lastSaved[key],
  );

  const set = (key: FeeKey) => (val: number | null) => {
    setSaved(false);
    setError(null);
    setFields((prev) => ({ ...prev, [key]: val ?? 0 }));
  };

  const setVoucherLimit = (val: number | null) => {
    setSaved(false);
    setError(null);
    setFields((prev) => ({
      ...prev,
      max_vouchers_per_order: Math.max(1, Math.round(val ?? 1)),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/fees", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setError(err.error ?? "Failed to save fees");
        return;
      }

      setLastSaved(fields);
      setSaved(true);
      router.refresh();
    } catch {
      setError("Failed to save fees");
    } finally {
      setSaving(false);
    }
  };

  const exampleTotal =
    fields.delivery_basic_price +
    fields.insurance_fee +
    fields.packing_fee +
    fields.handling_fee;

  const renderInput = ({ key, label, hint }: FeeField) => (
    <div key={key} className="space-y-1.5">
      <NumberInput
        label={label}
        subLabel={hint}
        value={fields[key]}
        onChange={set(key)}
        step={1000}
      />
      <p className="text-right font-mono text-xs tabular-nums text-muted">
        {formatVND(fields[key])}
      </p>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="card-panel overflow-hidden">
      <div className="table-divide divide-y">
        <div className="p-6 sm:p-8">
          <h2 className={sectionHeading}>
            <Truck className="h-3.5 w-3.5" aria-hidden="true" />
            Delivery
          </h2>
          <div className="mt-4 grid gap-6 sm:grid-cols-2">
            {deliveryFields.map(renderInput)}
          </div>
        </div>

        <div className="p-6 sm:p-8">
          <h2 className={sectionHeading}>
            <PackageCheck className="h-3.5 w-3.5" aria-hidden="true" />
            Carrier delivery (HCMC)
          </h2>
          <p className="mt-2 text-[13px] text-muted">
            The in-city courier tier (4h) carries no configured price.
            Checkout shows &ldquo;Cập nhật sau&rdquo; because the BE / Grab / Green
            SM rate depends on the parcel, and the amount is entered per order
            from the order detail screen once the courier is booked.
          </p>
        </div>

        <div className="p-6 sm:p-8">
          <h2 className={sectionHeading}>
            <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
            Order settings
          </h2>
          <div className="mt-4 grid gap-6 sm:grid-cols-2">
            {chargeFields.map(renderInput)}
            <div className="space-y-1.5">
              <NumberInput
                label="Max vouchers per order"
                subLabel="Số voucher tối đa/đơn hàng"
                value={fields.max_vouchers_per_order}
                onChange={setVoucherLimit}
                min={1}
                step={1}
              />
              <p className="text-right font-mono text-xs tabular-nums text-muted">
                {fields.max_vouchers_per_order} per order
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-[rgb(var(--admin-border))] px-6 pb-6 sm:px-8">
        <div className="rounded-lg bg-[rgb(var(--admin-hover))] p-4 ring-1 ring-inset ring-[rgb(var(--admin-border))]">
          <h3 className={sectionHeading}>
            <Calculator className="h-3.5 w-3.5" aria-hidden="true" />
            Fee breakdown
          </h3>
          <dl className="mt-3 space-y-1.5 text-[13px]">
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-body">Basic delivery</dt>
              <dd className="font-mono tabular-nums text-heading">
                {formatVND(fields.delivery_basic_price)}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-4 text-muted">
              <dt>Immediate delivery (optional)</dt>
              <dd className="font-mono tabular-nums">
                {formatVND(fields.delivery_immediate_price)}
              </dd>
            </div>
            {chargeFields.map(({ key, label }) => (
              <div
                key={key}
                className="flex items-baseline justify-between gap-4"
              >
                <dt className="text-body">{label}</dt>
                <dd className="font-mono tabular-nums text-heading">
                  {formatVND(fields[key])}
                </dd>
              </div>
            ))}
          </dl>
          <div className="mt-3 flex items-baseline justify-between gap-4 border-t border-[rgb(var(--admin-border))] pt-3">
            <div>
              <p className="text-sm font-medium text-heading">
                Estimated per order
              </p>
              <p className="text-xs text-muted">
                Basic delivery + insurance + packing + handling
              </p>
            </div>
            <p className="text-lg font-semibold tabular-nums text-[rgb(var(--admin-accent))]">
              {formatVND(exampleTotal)}
            </p>
          </div>
          <div className="mt-2 flex items-baseline justify-between gap-4 text-[13px]">
            <dt className="text-body">Max vouchers per order</dt>
            <dd className="font-mono tabular-nums text-heading">
              {fields.max_vouchers_per_order}
            </dd>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[rgb(var(--admin-border))] px-6 py-4 sm:px-8">
        <div className="flex min-w-0 items-center">
          {error ? (
            <span
              role="alert"
              className="flex items-center gap-1.5 text-[13px] text-red-600"
            >
              <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="truncate">{error}</span>
            </span>
          ) : dirty ? (
            <span className="flex items-center gap-1.5 text-[13px] text-amber-600">
              <span
                className="h-1.5 w-1.5 rounded-full bg-amber-500"
                aria-hidden="true"
              />
              Unsaved changes
            </span>
          ) : saved ? (
            <span className="flex items-center gap-1.5 text-[13px] text-emerald-600">
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              Changes saved
            </span>
          ) : (
            <span className="text-[13px] text-muted">All fees up to date</span>
          )}
        </div>

        <button
          type="submit"
          disabled={!dirty || saving}
          className="btn-primary h-9 px-4"
        >
          {saving ? (
            <>
              <span className="loading loading-spinner loading-sm" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" aria-hidden="true" />
              Save changes
            </>
          )}
        </button>
      </div>
    </form>
  );
}