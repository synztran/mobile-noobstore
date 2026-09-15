"use client";

import type {
  ServiceBookingRequest,
  ServiceBookingResponse,
} from "@/app/api/service-bookings/route";
import type { Service, ServiceOption } from "@/app/api/services/route";
import { formatVND } from "@/lib/currency";
import { useServiceBookingMutation } from "@/lib/react-query/service/api/useServiceQueries";
import { CheckCircle, Minus, Plus } from "lucide-react";
import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

// ─── Price summary ────────────────────────────────────────────────────────────

function computeTotal(
  basePrice: number,
  quantity: number,
  selectedIds: Set<number>,
  options: ServiceOption[],
): number {
  let adj = 0;
  for (const opt of options) {
    for (const val of opt.values) {
      if (selectedIds.has(val.id)) {
        adj += val.price_adjustment;
      }
    }
  }
  return (basePrice + adj) * quantity;
}

// ─── Option row ───────────────────────────────────────────────────────────────

function OptionGroup({
  option,
  selectedIds,
  onToggle,
}: {
  option: ServiceOption;
  selectedIds: Set<number>;
  onToggle: (id: number) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1">
        <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
          {option.label}
        </p>
        {option.is_required && (
          <span className="text-[10px] font-bold text-error">*</span>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {option.values.map((val) => {
          const active = selectedIds.has(val.id);
          return (
            <motion.button
              key={val.id}
              type="button"
              whileTap={{ scale: 0.94 }}
              onClick={() => onToggle(val.id)}
              className={`btn btn-xs h-auto rounded-xl border px-3 py-1.5 text-xs font-bold transition-colors ${
                active
                  ? "border-primary bg-primary text-primary-content"
                  : "border-outline-variant/30 bg-surface-container text-on-surface"
              }`}
            >
              {val.label}
              {val.price_adjustment !== 0 && (
                <span className="ml-1 opacity-70">
                  {val.price_adjustment > 0 ? "+" : ""}
                  {formatVND(val.price_adjustment)}
                </span>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Confirmation screen ──────────────────────────────────────────────────────

function ConfirmationScreen({
  orderNumber,
  onBack,
}: {
  orderNumber: string;
  onBack: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="flex flex-col items-center justify-center gap-6 px-6 py-20 text-center"
    >
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.08 }}
      >
        <CheckCircle className="h-16 w-16 text-success" />
      </motion.div>
      <div className="space-y-1">
        <p className="text-lg font-black uppercase tracking-tight text-on-surface">
          Đặt dịch vụ thành công!
        </p>
        <p className="text-sm text-on-surface-variant">Mã đơn hàng của bạn là</p>
        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
          className="text-base font-black text-primary"
        >
          {orderNumber}
        </motion.p>
      </div>
      <p className="text-sm text-on-surface-variant">
        Chúng tôi sẽ liên hệ để xác nhận chi tiết và lịch hẹn.
      </p>
      <button
        type="button"
        onClick={onBack}
        className="btn btn-primary rounded-full bg-gradient-to-r from-primary to-secondary px-6 text-[11px] font-black uppercase tracking-widest text-primary-content shadow-lg shadow-primary/20"
      >
        Xem thêm dịch vụ
      </button>
    </motion.div>
  );
}

// ─── Main configurator ────────────────────────────────────────────────────────

export function ServiceConfigurator({ service }: { service: Service }) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState("");
  const [pickupAt, setPickupAt] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  const toggleValue = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
    setValidationError(null);
  };

  const total = computeTotal(
    service.base_price,
    quantity,
    selectedIds,
    service.options,
  );

  const mutation = useServiceBookingMutation();

  const handleSubmit = () => {
    if (!pickupAt) {
      setValidationError("Vui lòng chọn thời gian nhận dịch vụ");
      return;
    }

    for (const opt of service.options) {
      if (!opt.is_required) continue;
      const hasSelection = opt.values.some((v) => selectedIds.has(v.id));
      if (!hasSelection) {
        setValidationError(`Vui lòng chọn "${opt.label}"`);
        return;
      }
    }

    const payload: ServiceBookingRequest = {
      pickup_at: new Date(pickupAt).toISOString(),
      selections: [
        {
          service_id: service.id,
          quantity,
          selected_option_value_ids: Array.from(selectedIds),
          line_note: note || undefined,
        },
      ],
      customer_note: note || undefined,
    };
    mutation.mutate(payload);
  };

  if (mutation.isSuccess && mutation.data) {
    return (
      <ConfirmationScreen
        orderNumber={mutation.data.order_number}
        onBack={() => router.push("/services")}
      />
    );
  }

  return (
    <div className="space-y-6">
      {service.options.length > 0 && (
        <div className="space-y-5">
          {service.options.map((opt) => (
            <OptionGroup
              key={opt.id}
              option={opt}
              selectedIds={selectedIds}
              onToggle={toggleValue}
            />
          ))}
        </div>
      )}

      <div className="space-y-2">
        <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
          Số lượng
        </p>
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="Giảm số lượng"
            disabled={quantity <= 1}
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            className="btn btn-circle btn-sm bg-surface-container text-on-surface hover:bg-surface-container-high disabled:opacity-40"
          >
            <Minus className="h-4 w-4" />
          </button>
          <motion.span
            key={quantity}
            initial={{ scale: 0.8, opacity: 0.5 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-6 text-center text-base font-black text-on-surface"
          >
            {quantity}
          </motion.span>
          <button
            type="button"
            aria-label="Tăng số lượng"
            onClick={() => setQuantity((q) => q + 1)}
            className="btn btn-circle btn-sm bg-surface-container text-on-surface hover:bg-surface-container-high"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      <label className="form-control space-y-2">
        <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
          Ghi chú (tuỳ chọn)
        </span>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="VD: Gateron Yellow, chỉ lube linear..."
          rows={3}
          className="textarea textarea-bordered w-full resize-none rounded-2xl bg-surface-container text-sm"
        />
      </label>

      <label className="form-control space-y-2">
        <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
          Thời gian nhận dịch vụ
        </span>
        <input
          type="datetime-local"
          value={pickupAt}
          onChange={(e) => setPickupAt(e.target.value)}
          className="input input-bordered w-full rounded-2xl border-outline-variant/40 bg-surface text-sm"
        />
      </label>

      {(validationError ?? mutation.error) && (
        <p className="text-xs font-bold text-error">
          {validationError ?? mutation.error?.message}
        </p>
      )}

      <div className="fixed bottom-0 left-0 right-0 z-[60] border-t border-outline-variant/20 bg-surface/80 px-4 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] backdrop-blur-xl">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
            Tổng dự kiến
          </span>
          <motion.span
            key={total}
            initial={{ scale: 0.9, opacity: 0.6 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-base font-black text-primary"
          >
            {formatVND(total)}
          </motion.span>
        </div>
        <motion.button
          type="button"
          onClick={handleSubmit}
          disabled={mutation.isPending}
          whileTap={{ scale: 0.98 }}
          className="btn btn-primary btn-block rounded-full bg-gradient-to-r from-primary to-secondary text-[11px] font-black uppercase tracking-widest text-primary-content shadow-lg shadow-primary/20"
        >
          {mutation.isPending ? (
            <span className="loading loading-spinner loading-sm" />
          ) : (
            "Đặt dịch vụ"
          )}
        </motion.button>
      </div>
    </div>
  );
}
