"use client";

import clsx from "clsx";
import { Store } from "lucide-react";
import { memo } from "react";

interface Props {
  hasPreOrder: boolean;
  pickupDate: string;
  pickupTime: string;
  minPickupDate: string;
  pickupSlots: string[];
  isPickupFieldInvalid: (
    field: "pickupDate" | "pickupTime"
  ) => boolean | undefined;
  onDateChange: (value: string) => void;
  onTimeChange: (value: string) => void;
  onBlur: (field: "pickupDate" | "pickupTime") => void;
}

function PickupSection({
  hasPreOrder,
  pickupDate,
  pickupTime,
  minPickupDate,
  pickupSlots,
  isPickupFieldInvalid,
  onDateChange,
  onTimeChange,
  onBlur,
}: Props) {
  return (
    <div className="space-y-3 rounded-2xl border-2 border-primary/30 bg-primary/5 p-4">
      <div className="flex items-center gap-2">
        <Store className="text-lg text-primary" />
        <div>
          <p className="text-sm font-black text-on-surface">
            Nhận tại cửa hàng
          </p>
          <p className="text-xs text-on-surface-variant">
            Noobstore HCM hoạt động mỗi ngày 08:00 – 19:00
          </p>
        </div>
      </div>

      {hasPreOrder ? (
        <div className="overflow-hidden rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3">
          <p className="text-xs font-black uppercase tracking-widest text-violet-700">
            Sản phẩm Pre-order
          </p>
          <p className="mt-0.5 text-xs leading-relaxed text-violet-600">
            Đơn hàng có sản phẩm pre-order, NoobStore sẽ chủ động liên hệ bạn để
            lấy khi sản phẩm đã về hàng
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 ml-1 block text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
              Ngày nhận hàng <span className="ml-0.5 text-primary">*</span>
            </label>
            <input
              type="date"
              value={pickupDate}
              min={minPickupDate}
              onChange={(e) => onDateChange(e.target.value)}
              onBlur={() => onBlur("pickupDate")}
              className={clsx(
                "w-full rounded-2xl border-2 bg-surface-container px-4 py-3.5 text-sm font-medium text-on-surface outline-none transition-all",
                isPickupFieldInvalid("pickupDate")
                  ? "border-error"
                  : "border-transparent focus-within:border-primary"
              )}
            />
            <p className="ml-1 mt-1 text-[10px] font-bold text-on-surface-variant">
              Sớm nhất:{" "}
              {new Date(`${minPickupDate}T00:00:00`).toLocaleDateString(
                "vi-VN",
                {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                }
              )}
            </p>
            {isPickupFieldInvalid("pickupDate") && (
              <p className="ml-1 mt-1 text-[10px] font-bold text-error">
                Trường này là bắt buộc
              </p>
            )}
          </div>

          <div>
            <label className="mb-2 ml-1 block text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
              Giờ nhận hàng <span className="ml-0.5 text-primary">*</span>
            </label>
            <select
              value={pickupTime}
              onChange={(e) => onTimeChange(e.target.value)}
              onBlur={() => onBlur("pickupTime")}
              className={clsx(
                "w-full appearance-none rounded-2xl border-2 bg-surface-container px-4 py-3.5 text-sm font-medium text-on-surface outline-none transition-all",
                isPickupFieldInvalid("pickupTime")
                  ? "border-error"
                  : "border-transparent focus-within:border-primary"
              )}
            >
              <option value="">Chọn giờ</option>
              {pickupSlots.map((slot) => (
                <option key={slot} value={slot}>
                  {slot}
                </option>
              ))}
            </select>
            {isPickupFieldInvalid("pickupTime") && (
              <p className="ml-1 mt-1 text-[10px] font-bold text-error">
                Trường này là bắt buộc
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(PickupSection);
