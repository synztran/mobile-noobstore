"use client";

import { WsDate } from "react-wheel-scroller/datetime";
import { WsSelect } from "react-wheel-scroller/select";
import "react-wheel-scroller/styles.css";
import clsx from "clsx";
import { Calendar, Clock, Store } from "lucide-react";
import { memo, useMemo } from "react";

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

const PICKUP_HORIZON_DAYS = 7;

// Sentinel first slot so the time wheel never auto-selects a real time.
// It renders as a "choose a time" prompt and maps to an empty value so it is
// rejected by the onSet guard (state stays empty until a real slot is picked).
const TIME_PLACEHOLDER = { text: "Chọn giờ", value: "" };

const VIETNAMESE_MONTHS = [
  "Tháng 1",
  "Tháng 2",
  "Tháng 3",
  "Tháng 4",
  "Tháng 5",
  "Tháng 6",
  "Tháng 7",
  "Tháng 8",
  "Tháng 9",
  "Tháng 10",
  "Tháng 11",
  "Tháng 12",
];

function toYmd(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function fromYmd(value: string): Date {
  return new Date(`${value}T00:00:00`);
}

function formatPickupDate(value: string): string {
  return new Date(`${value}T00:00:00`).toLocaleDateString("vi-VN", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
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
  const minDate = fromYmd(minPickupDate);
  const maxDate = new Date(minDate);
  maxDate.setDate(maxDate.getDate() + PICKUP_HORIZON_DAYS);
  const dateInvalid = isPickupFieldInvalid("pickupDate");

  const timeData = useMemo(
    () =>
      pickupTime
        ? pickupSlots.map((s) => ({ text: s, value: s }))
        : [
            TIME_PLACEHOLDER,
            ...pickupSlots.map((s) => ({ text: s, value: s })),
          ],
    [pickupSlots, pickupTime]
  );

  return (
    <div className="space-y-3 rounded-2xl border-2 border-primary/30 bg-primary/5 p-4">
      <div className="flex items-center gap-2">
        <Store className="text-lg text-primary" />
        <div>
          <p className="text-sm font-black text-on-surface">
            Nhận tại cửa hàng
          </p>
          <p className="text-xs text-on-surface-variant">
            Noobstore HCM mở cửa mỗi ngày 08:00 – 19:00 (T7, CN: 08:00 – 17:00)
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
        <div className="flex items-stretch gap-2">
          <div>
            <label className="mb-2 ml-1 block text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
              Ngày nhận hàng <span className="ml-0.5 text-primary">*</span>
            </label>
            <div className="relative">
              <WsDate
                value={pickupDate ? fromYmd(pickupDate) : undefined}
                min={minDate}
                max={maxDate}
                display="bottom"
                touchUi
                returnFormat="jsdate"
                monthNames={VIETNAMESE_MONTHS}
                dateFormat="dd/mm/yyyy"
                setText="Chọn"
                cancelText="Hủy"
                onSet={(_event, inst) => {
                  const date = inst.getDate();
                  if (date) onDateChange(toYmd(date));
                }}
              >
                <input
                  type="text"
                  readOnly
                  placeholder="Chọn ngày"
                  value={pickupDate ? formatPickupDate(pickupDate) : ""}
                  onBlur={() => onBlur("pickupDate")}
                  className={clsx(
                    "relative w-full cursor-pointer rounded-2xl bg-surface-container p-3 text-left text-sm font-medium text-on-surface outline-none transition-all border",
                    dateInvalid
                      ? "border-error"
                      : "border-primary focus-within:border-primary-action"
                  )}
                />
              </WsDate>
              <Calendar className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
            </div>
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
            {dateInvalid && (
              <p className="ml-1 mt-1 text-[10px] font-bold text-error">
                Trường này là bắt buộc
              </p>
            )}
          </div>

          <div>
            <label className="mb-2 ml-1 block text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
              Giờ nhận hàng <span className="ml-0.5 text-primary">*</span>
            </label>
            <div className="relative">
              <WsSelect
                data={timeData}
                dataText="text"
                dataValue="value"
                value={pickupTime}
                display="bottom"
                touchUi
                placeholder="Chọn giờ"
                setText="Chọn"
                cancelText="Hủy"
                onSet={(_event, inst) => {
                  const val = inst.getVal();
                  if (val) onTimeChange(String(val));
                }}
              >
                <input
                  type="text"
                  readOnly
                  placeholder="Chọn giờ"
                  value={pickupTime}
                  onBlur={() => onBlur("pickupTime")}
                  className={clsx(
                    "relative w-full cursor-pointer rounded-2xl bg-surface-container p-3 text-left text-sm font-medium text-on-surface outline-none transition-all border",
                    isPickupFieldInvalid("pickupTime")
                      ? "border-error"
                      : "border-primary focus-within:border-primary-action"
                  )}
                />
              </WsSelect>
              <Clock className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
            </div>
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
