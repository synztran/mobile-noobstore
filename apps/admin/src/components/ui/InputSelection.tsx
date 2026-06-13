"use client";

import React, { SelectHTMLAttributes, useId } from "react";

// Support both simple string arrays or label/value object pairs
export type SelectOption = string | { label: string; value: string | number };

type SelectInputProps = SelectHTMLAttributes<HTMLSelectElement> & {
  options: SelectOption[];
  label?: string;
  required?: boolean;
  containerClassName?: string;
  placeholder?: string; // Optional placeholder for the select
  onChange?: (event: React.ChangeEvent<HTMLSelectElement>) => void; // Override onChange to ensure correct typing
};

export default function InputSelection({
  options,
  label,
  required,
  className = "",
  containerClassName = "",
  id,
  onChange,
  ...rest
}: SelectInputProps) {
  // Generate a unique ID for the label/select linkage if one isn't provided
  const generatedId = useId();
  const selectId = id || generatedId;

  return (
    <div className={`w-full ${containerClassName}`}>
      {/* Conditionally render the label */}
      {label && (
        <label
          htmlFor={selectId}
          className="mb-1 block text-sm font-medium text-slate-700"
        >
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      <select
        id={selectId}
        required={required}
        className={`h-[38px] w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
        onChange={onChange}
        {...rest}
      >
        {/* Optional: Add a placeholder option if a standard placeholder is passed */}
        {rest.placeholder && (
          <option value="" disabled hidden>
            {rest.placeholder}
          </option>
        )}

        {/* Map through options */}
        {options.map((opt, index) => {
          const isString = typeof opt === "string";
          const val = isString ? opt : opt.value;
          const text = isString ? opt : opt.label;

          return (
            <option key={`${val}-${index}`} value={val}>
              {text}
            </option>
          );
        })}
      </select>
    </div>
  );
}
