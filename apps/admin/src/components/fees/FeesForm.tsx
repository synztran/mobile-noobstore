"use client";

import { formatVND } from "@/lib/currency";
import NumberInput from "@/components/ui/NumberInput";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface FeesFormProps {
  initial: {
    delivery_immediate_price: number;
    delivery_basic_price: number;
    insurance_fee: number;
    packing_fee: number;
    handling_fee: number;
    max_vouchers_per_order: number;
  };
}

export default function FeesForm({ initial }: FeesFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [fields, setFields] = useState(initial);

  const set = (key: keyof typeof fields) => (val: number | null) => {
    setFields((prev) => ({ ...prev, [key]: val ?? 0 }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch("/api/fees", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error ?? "Failed to save fees");
        return;
      }

      router.refresh();
    } catch {
      alert("Failed to save fees");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-lg space-y-5">
      <div className="space-y-1">
        <NumberInput
          label="Delivery Immediate Price"
          subLabel="Phí giao nhanh"
          value={fields.delivery_immediate_price}
          onChange={set("delivery_immediate_price")}
          step={1000}
        />
        <p className="text-right text-xs text-slate-400">{formatVND(fields.delivery_immediate_price)}</p>
      </div>
      <div className="space-y-1">
        <NumberInput
          label="Delivery Basic Price"
          subLabel="Phí giao cơ bản"
          value={fields.delivery_basic_price}
          onChange={set("delivery_basic_price")}
          step={1000}
        />
        <p className="text-right text-xs text-slate-400">{formatVND(fields.delivery_basic_price)}</p>
      </div>
      <div className="space-y-1">
        <NumberInput
          label="Insurance Fee"
          subLabel="Phí bảo hiểm"
          value={fields.insurance_fee}
          onChange={set("insurance_fee")}
          step={1000}
        />
        <p className="text-right text-xs text-slate-400">{formatVND(fields.insurance_fee)}</p>
      </div>
      <div className="space-y-1">
        <NumberInput
          label="Packing Fee"
          subLabel="Phí đóng gói"
          value={fields.packing_fee}
          onChange={set("packing_fee")}
          step={1000}
        />
        <p className="text-right text-xs text-slate-400">{formatVND(fields.packing_fee)}</p>
      </div>
      <div className="space-y-1">
        <NumberInput
          label="Handling Fee"
          subLabel="Phí xử lý"
          value={fields.handling_fee}
          onChange={set("handling_fee")}
          step={1000}
        />
        <p className="text-right text-xs text-slate-400">{formatVND(fields.handling_fee)}</p>
      </div>

      <div className="space-y-1">
        <NumberInput
          label="Max Vouchers Per Order"
          subLabel="Số voucher tối đa/đơn hàng"
          value={fields.max_vouchers_per_order}
          onChange={set("max_vouchers_per_order")}
          min={1}
          step={1}
        />
        <p className="text-right text-xs text-slate-400">
          {fields.max_vouchers_per_order} vouchers
        </p>
      </div>

      <button
        type="submit"
        disabled={saving}
        className="btn btn-primary w-full"
      >
        {saving ? (
          <span className="loading loading-spinner loading-sm" />
        ) : (
          "Save Fees"
        )}
      </button>
    </form>
  );
}
