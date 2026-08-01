"use client";

import Icon from "@/components/ui/Icon";
import clsx from "clsx";
import { CheckCircle2, MapPinHouse, Phone } from "lucide-react";
import { memo } from "react";

type Field = {
  name: "fullName" | "apartment" | "phoneNumber";
  label: string;
  placeholder: string;
  icon: string | React.ReactNode;
  type: string;
  required: boolean;
  colSpan: number;
};

const FIELDS: Field[] = [
  {
    name: "fullName",
    label: "Họ và tên",
    placeholder: "Nguyễn Văn A",
    icon: "person",
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
  apartment: string;
  phoneNumber: string;
  isPickup: boolean;
  fullNameInvalid: boolean;
  phoneNumberInvalid: boolean;
  onChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => void;
  onBlur: (e: React.FocusEvent<HTMLInputElement>) => void;
}

function ContactInfoFields({
  fullName,
  apartment,
  phoneNumber,
  isPickup,
  fullNameInvalid,
  phoneNumberInvalid,
  onChange,
  onBlur,
}: Props) {
  const values: Record<string, string> = { fullName, apartment, phoneNumber };
  const invalidFlags: Record<string, boolean> = {
    fullName: fullNameInvalid,
    phoneNumber: phoneNumberInvalid,
  };

  return (
    <div className="grid grid-cols-2 gap-2">
      {FIELDS.filter(
        (field) =>
          !isPickup || field.name === "fullName" || field.name === "phoneNumber"
      ).map((field) => {
        const invalid = invalidFlags[field.name] ?? false;
        return (
          <div
            key={field.name}
            className={
              field.colSpan === 2 && !isPickup ? "col-span-2" : "col-span-1"
            }
          >
            <label className="mb-2 ml-1 block text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
              {field.label}
              {field.required && <span className="ml-0.5 text-primary">*</span>}
            </label>
            <div
              className={clsx(
                "flex items-center gap-2 rounded-2xl border-2 bg-surface-container px-2 py-3 transition-all",
                invalid
                  ? "border-error"
                  : "border-transparent focus-within:border-primary"
              )}
            >
              {typeof field.icon === "string" ? (
                <Icon
                  name={String(field.icon)}
                  className={clsx(
                    "flex-shrink-0 text-xl transition-colors",
                    invalid ? "text-error" : "text-primary"
                  )}
                />
              ) : (
                <div
                  className={clsx(
                    "flex-shrink-0 text-xl transition-colors",
                    invalid ? "text-error" : "text-primary"
                  )}
                >
                  {field.icon}
                </div>
              )}
              <input
                name={field.name}
                value={values[field.name]}
                onChange={onChange}
                onBlur={onBlur}
                placeholder={field.placeholder}
                type={field.type}
                autoComplete="off"
                className="min-w-0 flex-1 bg-transparent text-sm font-medium text-on-surface outline-none placeholder:text-on-surface-variant/40"
              />
              {values[field.name] && !invalid && (
                <CheckCircle2
                  size={16}
                  className="flex-shrink-0 text-green-600"
                />
              )}
            </div>
            {invalid && (
              <p className="ml-1 mt-1 text-[10px] font-bold text-error">
                Trường này là bắt buộc
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default memo(ContactInfoFields);
