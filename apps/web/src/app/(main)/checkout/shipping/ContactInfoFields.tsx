"use client";

import clsx from "clsx";
import { CheckCircle2, MapPinHouse, Phone, User } from "lucide-react";
import { memo } from "react";

type Field = {
  name: "fullName" | "apartment" | "phoneNumber";
  label: string;
  placeholder: string;
  icon: React.ReactNode;
  type: string;
  required: boolean;
  colSpan: number;
};

const FIELDS: Field[] = [
  {
    name: "fullName",
    label: "Họ và tên",
    placeholder: "Nguyễn Văn A",
    icon: <User size={20} />,
    type: "text",
    required: true,
    colSpan: 2,
  },
  {
    name: "apartment",
    label: "Căn hộ / Tầng",
    placeholder: "Tầng 4B",
    icon: <MapPinHouse size={20} />,
    type: "text",
    required: false,
    colSpan: 1,
  },
  {
    name: "phoneNumber",
    label: "Số điện thoại",
    placeholder: "0901 234 567",
    icon: <Phone size={20} />,
    type: "tel",
    required: true,
    colSpan: 1,
  },
];

interface Props {
  fullName: string;
  apartment?: string;
  phoneNumber: string;
  isPickup?: boolean;
  fullNameInvalid: boolean;
  phoneNumberInvalid: boolean;
  onChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => void;
  onBlur: (e: React.FocusEvent<HTMLInputElement>) => void;
}

function ContactInfoFields({
  fullName,
  phoneNumber,
  fullNameInvalid,
  phoneNumberInvalid,
  onChange,
  onBlur,
}: Props) {
  return (
    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
      {/* Full Name */}
      <div>
        <label className="mb-1.5 ml-1 block text-[11px] font-extrabold uppercase tracking-wider text-on-surface-variant">
          Họ và tên <span className="ml-0.5 text-primary">*</span>
        </label>
        <div
          className={clsx(
            "flex items-center gap-2 rounded-xl border bg-surface-container/60 px-3.5 py-2.5 transition-all",
            fullNameInvalid
              ? "border-error bg-error/5"
              : "border-outline-variant/30 focus-within:border-primary focus-within:bg-surface"
          )}
        >
          <div
            className={clsx(
              "flex-shrink-0 text-xl transition-colors",
              fullNameInvalid ? "text-error" : "text-primary"
            )}
          >
            <User size={18} />
          </div>
          <input
            name="fullName"
            value={fullName}
            onChange={onChange}
            onBlur={onBlur}
            placeholder="Ví dụ: Nguyễn Văn A"
            type="text"
            autoComplete="off"
            className="min-w-0 flex-1 bg-transparent text-sm font-medium text-on-surface outline-none placeholder:text-on-surface-variant/40"
          />
          {fullName && !fullNameInvalid && (
            <CheckCircle2 size={16} className="flex-shrink-0 text-green-600" />
          )}
        </div>
        {fullNameInvalid && (
          <p className="ml-1 mt-1 text-[10px] font-bold text-error">
            Trường này là bắt buộc
          </p>
        )}
      </div>

      {/* Phone Number */}
      <div>
        <label className="mb-1.5 ml-1 block text-[11px] font-extrabold uppercase tracking-wider text-on-surface-variant">
          Số điện thoại <span className="ml-0.5 text-primary">*</span>
        </label>
        <div
          className={clsx(
            "flex items-center gap-2 rounded-xl border bg-surface-container/60 px-3.5 py-2.5 transition-all",
            phoneNumberInvalid
              ? "border-error bg-error/5"
              : "border-outline-variant/30 focus-within:border-primary focus-within:bg-surface"
          )}
        >
          <div
            className={clsx(
              "flex-shrink-0 text-xl transition-colors",
              phoneNumberInvalid ? "text-error" : "text-primary"
            )}
          >
            <Phone size={18} />
          </div>
          <input
            name="phoneNumber"
            value={phoneNumber}
            onChange={onChange}
            onBlur={onBlur}
            placeholder="Ví dụ: 0901 234 567"
            type="tel"
            autoComplete="off"
            className="min-w-0 flex-1 bg-transparent text-sm font-medium text-on-surface outline-none placeholder:text-on-surface-variant/40"
          />
          {phoneNumber && !phoneNumberInvalid && (
            <CheckCircle2 size={16} className="flex-shrink-0 text-green-600" />
          )}
        </div>
        {phoneNumberInvalid && (
          <p className="ml-1 mt-1 text-[10px] font-bold text-error">
            Trường này là bắt buộc
          </p>
        )}
      </div>
    </div>
  );
}

export default memo(ContactInfoFields);
