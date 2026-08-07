"use client";

import { useEffect, useRef, useState } from "react";

export type AsyncSelectOption = {
  key: string;
  label: string;
};

type Props = {
  label?: string;
  placeholder?: string;
  value: string[];
  onChange: (keys: string[]) => void;
  fetchOptions: (query: string) => Promise<AsyncSelectOption[]>;
  resolveSelected: (keys: string[]) => Promise<AsyncSelectOption[]>;
  required?: boolean;
  hint?: string;
  emptyMessage?: string;
};

export default function AsyncMultiSelect({
  label,
  placeholder = "Tìm kiếm...",
  value,
  onChange,
  fetchOptions,
  resolveSelected,
  required,
  hint,
  emptyMessage = "Không tìm thấy kết quả",
}: Props) {
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<AsyncSelectOption[]>([]);
  const [selectedLabels, setSelectedLabels] = useState<
    Record<string, string>
  >({});
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ids = value.filter((key) => !selectedLabels[key]);
    if (ids.length === 0) return;
    let cancelled = false;
    resolveSelected(ids)
      .then((resolved) => {
        if (cancelled) return;
        setSelectedLabels((prev) => {
          const next = { ...prev };
          for (const opt of resolved) next[opt.key] = opt.label;
          return next;
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  useEffect(() => {
    const queryTrimmed = query.trim();
    if (!queryTrimmed) {
      setOptions([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const timer = window.setTimeout(() => {
      fetchOptions(queryTrimmed)
        .then((results) => {
          if (cancelled) return;
          setOptions(
            results.filter((opt) => !value.includes(opt.key))
          );
        })
        .catch(() => {
          if (!cancelled) setOptions([]);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectKey = (key: string) => {
    if (!value.includes(key)) onChange([...value, key]);
    setQuery("");
    setOpen(false);
  };

  const removeKey = (key: string) => {
    onChange(value.filter((k) => k !== key));
    setSelectedLabels((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  return (
    <div ref={containerRef} className="relative">
      {label && (
        <label className="mb-1 block text-sm font-medium text-slate-700">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          if (query.trim()) setOpen(true);
        }}
        placeholder={placeholder}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      {open && query.trim() && (
        <div className="absolute z-10 mt-1 max-h-40 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
          {loading && (
            <p className="px-3 py-2 text-xs text-slate-400">Đang tải...</p>
          )}
          {!loading && options.length === 0 && (
            <p className="px-3 py-2 text-xs text-slate-400">{emptyMessage}</p>
          )}
          {!loading &&
            options.map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => selectKey(opt.key)}
                className="block w-full truncate px-3 py-2 text-left text-sm hover:bg-slate-50"
              >
                {opt.label}
              </button>
            ))}
        </div>
      )}
      {value.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {value.map((key) => (
            <span
              key={key}
              className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-1 text-xs text-blue-700"
            >
              {selectedLabels[key] ?? key}
              <button
                type="button"
                onClick={() => removeKey(key)}
                className="text-blue-400 hover:text-blue-700"
                aria-label="Remove"
              >
                &times;
              </button>
            </span>
          ))}
        </div>
      )}
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}
