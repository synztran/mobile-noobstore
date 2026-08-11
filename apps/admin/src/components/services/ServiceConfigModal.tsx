"use client";

import NumberInput from "@/components/ui/NumberInput";
import { formatVND } from "@/lib/currency";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export interface ServiceConfigRow {
  id: string;
  service_id?: string;
  base_price: number;
  handling_days: number;
  is_active: boolean;
  updated_at: string | null;
}

interface ServiceConfigModalProps {
  open: boolean;
  onClose: () => void;
  serviceId: string;
  serviceName: string;
  defaultPrice: number;
  defaultHandlingDays: number;
  config: ServiceConfigRow | null;
}

export default function ServiceConfigModal({
  open,
  onClose,
  serviceId,
  serviceName,
  defaultPrice,
  defaultHandlingDays,
  config,
}: ServiceConfigModalProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [price, setPrice] = useState<number | null>(defaultPrice);
  const [days, setDays] = useState<number | null>(defaultHandlingDays);

  useEffect(() => {
    if (!open) return;
    setPrice(config?.base_price ?? defaultPrice);
    setDays(config?.handling_days ?? defaultHandlingDays);
    setError("");
  }, [open, config, defaultPrice, defaultHandlingDays]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/service-configs", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service_id: serviceId,
          base_price: price ?? 0,
          handling_days: days ?? 0,
          is_active: true,
        }),
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? "Failed to save config");
      }

      router.refresh();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  const overridden =
    !!config ||
    price !== defaultPrice ||
    days !== defaultHandlingDays;

  return (
    <div className="fixed inset-0 z-50 !mt-0 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" />
      <div className="relative mx-4 flex max-h-[90vh] w-full max-w-md flex-col rounded-xl bg-white shadow-2xl dark:bg-slate-800">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-700">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Cấu hình dịch vụ
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {serviceName}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 space-y-4 overflow-y-auto p-6">
            {error && (
              <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Các giá trị bên dưới ghi đè giá mặc định từ danh mục dịch vụ.
              <span className="mt-1 block">
                Mặc định hiện tại: {formatVND(defaultPrice)} ·{" "}
                {defaultHandlingDays} ngày xử lý
              </span>
            </p>

            <NumberInput
              label="Giá dịch vụ (₫) *"
              value={price}
              onChange={(v) => setPrice(v ?? 0)}
              min={0}
              step={1000}
            />
            <p className="text-right text-xs text-slate-400 dark:text-slate-500">
              {formatVND(price ?? 0)}
            </p>

            <NumberInput
              label="Số ngày xử lý *"
              subLabel="Thời gian xử lý (handling days)"
              value={days}
              onChange={(v) => setDays(v ?? 0)}
              min={0}
              step={1}
            />
            <p className="text-right text-xs text-slate-400 dark:text-slate-500">
              {days ?? 0} ngày
            </p>

            {overridden && (
              <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                Lưu ý: giá trị này sẽ ghi đè giá hiển thị trên storefront.
              </div>
            )}
          </div>

          <div className="flex shrink-0 justify-end gap-2 border-t border-slate-200 px-6 py-4 dark:border-slate-700">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-ghost"
            >
              Huỷ
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn btn-primary"
            >
              {saving ? (
                <span className="loading loading-spinner loading-sm" />
              ) : (
                "Lưu cấu hình"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}