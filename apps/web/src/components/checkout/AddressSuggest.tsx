"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface Suggestion {
  place_id?: string;
  place_name: string;
  lat?: number;
  lon?: number;
}

interface Props {
  value: string;
  onChange: (value: string, lat?: number, lon?: number) => void;
  onBlur?: () => void;
  city?: string;
  district?: string;
  ward?: string;
  disabled?: boolean;
  placeholder?: string;
}

const GEOCODE_API = "/api/geocode";

function buildQuery(ward?: string, district?: string, city?: string) {
  const parts: string[] = [];
  if (ward) parts.push(ward);
  if (district) parts.push(district);
  if (city) parts.push(city);
  parts.push("Vietnam");
  return parts.join(", ");
}

function fetchSuggestions(
  q: string,
  count: number,
  reqRef: React.MutableRefObject<number>,
  onResult: (items: Suggestion[]) => void
) {
  fetch(`${GEOCODE_API}?q=${encodeURIComponent(q)}`)
    .then((res) => (res.ok ? res.json() : { features: [] }))
    .then((data: { features?: Suggestion[] }) => {
      if (reqRef.current !== count) return;
      onResult(data.features ?? []);
    })
    .catch(() => onResult([]));
}

export default function AddressSuggest({
  value: _value,
  onChange,
  onBlur,
  city,
  district,
  ward,
  disabled,
  placeholder,
}: Props) {
  const [inputValue, setInputValue] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const fetchTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const changeTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const reqRef = useRef(0);
  const selectedRef = useRef(false);

  const locationQuery = buildQuery(ward, district, city);
  const hasLocation = !!ward && !!city;

  const doFetch = useCallback(
    (query: string, count: number) => {
      const q = query ? `${query}, ${locationQuery}` : locationQuery;
      setLoading(true);
      fetchSuggestions(q, count, reqRef, (items) => {
        setSuggestions(items);
        setActiveIdx(-1);
        setLoading(false);
      });
    },
    [locationQuery]
  );

  // Clear internal input when ward/district/city changes
  useEffect(() => {
    setInputValue("");
    setSuggestions([]);
    selectedRef.current = false;
  }, [ward, district, city]);

  // Auto-fetch when ward/district/city changes (debounced)
  useEffect(() => {
    if (!hasLocation) {
      setSuggestions([]);
      return;
    }

    clearTimeout(changeTimerRef.current);
    changeTimerRef.current = setTimeout(() => {
      const count = ++reqRef.current;
      setSuggestions([]);
      doFetch("", count);
    }, 500);

    return () => clearTimeout(changeTimerRef.current);
  }, [ward, district, city, hasLocation, doFetch]);

  // Debounced fetch when user types
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setInputValue(v);
    selectedRef.current = false;
    if (!hasLocation || v.trim().length < 2) return;

    clearTimeout(fetchTimerRef.current);
    const count = ++reqRef.current;

    fetchTimerRef.current = setTimeout(() => {
      doFetch(v, count);
    }, 400);
  };

  const select = (idx: number) => {
    const s = suggestions[idx];
    if (!s) return;

    selectedRef.current = true;
    setSuggestions([]);
    setInputValue(s.place_name);

    if (s.lat !== undefined && s.lon !== undefined) {
      onChange(s.place_name, s.lat, s.lon);
    } else if (s.place_id) {
      setLoading(true);
      fetch(`/api/geocode/detail?place_id=${s.place_id}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((detail) => {
          if (detail && detail.lat && detail.lon) {
            onChange(detail.place_name || s.place_name, detail.lat, detail.lon);
          } else {
            onChange(s.place_name);
          }
        })
        .catch(() => onChange(s.place_name))
        .finally(() => setLoading(false));
    } else {
      onChange(s.place_name);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === "Enter" && activeIdx >= 0) {
      e.preventDefault();
      select(activeIdx);
    }
  };

  const showList = suggestions.length > 0;

  const handleBlurInternal = () => {
    // Sync typed text to parent on blur if user didn't select a suggestion
    if (!selectedRef.current && inputValue !== _value) {
      onChange(inputValue);
    }
    onBlur?.();
  };

  return (
    <div className="w-full">
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onBlur={handleBlurInternal}
          disabled={disabled}
          placeholder={
            hasLocation
              ? "Gõ ít nhất 2 ký tự để tìm gợi ý..."
              : (placeholder ??
                "Chọn Tỉnh/Thành phố, Quận/Huyện, Phường/Xã trước")
          }
          className="min-w-0 flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-on-surface-variant/40"
          autoComplete="off"
          role="combobox"
          aria-autocomplete="list"
        />
        {inputValue && (
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              onChange("");
              setInputValue("");
              setSuggestions([]);
              inputRef.current?.focus();
            }}
            className="flex-shrink-0 rounded-full p-0.5 text-on-surface-variant/50 transition-colors hover:text-on-surface"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
        {loading ? (
          <span className="loading loading-spinner loading-xs text-primary" />
        ) : null}
      </div>

      {hasLocation && !showList && !loading && inputValue.length === 0 && (
        <p className="mt-1 text-xs font-medium text-on-surface-variant/60">
          Đang tải gợi ý...
        </p>
      )}

      {showList && (
        <div className="absolute left-0 right-0 top-12 z-10 overflow-hidden rounded-b-xl border border-outline-variant bg-surface shadow-sm">
          <div className="border-b border-outline-variant/30 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/50">
            Gợi ý địa chỉ
          </div>
          <ul role="listbox" className="max-h-56 overflow-y-auto">
            {suggestions.map((s, i) => (
              <li
                key={s.place_id ?? `${s.lat}-${s.lon}-${i}`}
                role="option"
                aria-selected={i === activeIdx}
                onMouseDown={() => select(i)}
                onMouseEnter={() => setActiveIdx(i)}
                className={`cursor-pointer border-b border-outline-variant/20 px-3 py-3 text-xs leading-tight transition-colors last:border-b-0 ${
                  i === activeIdx
                    ? "bg-primary/10 text-on-surface"
                    : "text-on-surface-variant hover:bg-surface-container-high"
                }`}
              >
                {s.place_name}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
