"use client";

import React, { InputHTMLAttributes, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

type NumberInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange" | "type"
> & {
  value?: number | null;
  onChange?: (value: number | null) => void;
  allowClear?: boolean;
  step?: number | string;
};

export default function NumberInput({
  value,
  onChange,
  allowClear = true,
  className = "",
  step,
  placeholder,
  ...rest
}: NumberInputProps) {
  const [local, setLocal] = useState<string>(
    value != null ? String(value) : ""
  );
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setLocal(value != null ? String(value) : "");
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setLocal(v);
    if (v === "") {
      onChange?.(null);
      return;
    }
    const num = Number(v);
    if (!Number.isNaN(num)) {
      onChange?.(num);
    }
  };

  const handleClear = () => {
    setLocal("");
    onChange?.(null);
    inputRef.current?.focus();
  };

  const handleBlur = () => {
    if (local === "") {
      onChange?.(null);
      return;
    }
    const num = Number(local);
    if (Number.isNaN(num)) {
      setLocal(value != null ? String(value) : "");
    } else {
      const normalized = String(num);
      if (normalized !== local) setLocal(normalized);
      onChange?.(num);
    }
  };

  return (
    <div className={`relative ${className}`}>
      <input
        ref={inputRef}
        type="number"
        inputMode="decimal"
        step={step ?? "any"}
        placeholder={placeholder}
        value={local}
        onChange={handleChange}
        onBlur={handleBlur}
        className="input input-bordered max-h-[38px] w-full pr-10 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        {...rest}
      />

      {allowClear && local !== "" && (
        <button
          type="button"
          onClick={handleClear}
          aria-label="Clear"
          className="text-muted absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
