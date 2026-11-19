"use client";

import { apiFetch } from "@/lib/api/fetch";
import { useCallback, useEffect, useRef, useState } from "react";
import { MapPin, Sparkles, X } from "lucide-react";
import clsx from "clsx";

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
  const [inputValue, setInputValue] = useState(_value || "");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fetchTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const changeTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const reqRef = useRef(0);
  const selectedRef = useRef(false);

  const locationQuery = buildQuery(ward, district, city);
  const hasLocation = !!ward && !!city;

  // Sync external value whenever parent changes it
  useEffect(() => {
    setInputValue(_value || "");
  }, [_value]);

  // Auto resize textarea height (up to 2 lines)
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 46)}px`;
  }, [inputValue]);

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

  // Reset dropdown when ward/district/city changes
  useEffect(() => {
    setSuggestions([]);
    setIsOpen(false);
    selectedRef.current = false;
  }, [ward, district, city]);

  // Pre-fetch suggestions when ward/district/city changes
  useEffect(() => {
    if (!hasLocation) {
      setSuggestions([]);
      return;
    }

    clearTimeout(changeTimerRef.current);
    changeTimerRef.current = setTimeout(() => {
      const count = ++reqRef.current;
      doFetch("", count);
    }, 400);

    return () => clearTimeout(changeTimerRef.current);
  }, [ward, district, city, hasLocation, doFetch]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced fetch when user types
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const v = e.target.value;
    setInputValue(v);
    selectedRef.current = false;
    setIsOpen(true);
    if (!hasLocation || v.trim().length < 2) return;

    clearTimeout(fetchTimerRef.current);
    const count = ++reqRef.current;

    fetchTimerRef.current = setTimeout(() => {
      doFetch(v, count);
    }, 350);
  };

  const select = (idx: number) => {
    const s = suggestions[idx];
    if (!s) return;

    selectedRef.current = true;
    setIsOpen(false);
    setInputValue(s.place_name);

    if (s.lat !== undefined && s.lon !== undefined) {
      onChange(s.place_name, s.lat, s.lon);
    } else if (s.place_id) {
      setLoading(true);
      apiFetch(`/api/geocode/detail?place_id=${s.place_id}`)
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
    if (!isOpen || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === "Enter" && activeIdx >= 0) {
      e.preventDefault();
      select(activeIdx);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  const showList = isOpen && suggestions.length > 0;

  const handleBlurInternal = () => {
    // Sync typed text to parent on blur if user didn't select a suggestion
    if (!selectedRef.current && inputValue !== _value) {
      onChange(inputValue);
    }
    onBlur?.();
  };

  // Helper to split place_name into main part and address details
  const formatAddressParts = (placeName: string) => {
    const parts = placeName.split(",").map((p) => p.trim());
    if (parts.length <= 1) return { main: placeName, sub: "" };
    const main = parts[0];
    const sub = parts.slice(1).join(", ");
    return { main, sub };
  };

  return (
    <div ref={containerRef} className="min-w-0 flex-1">
      <div className="flex items-start gap-2">
        <textarea
          ref={inputRef}
          value={inputValue}
          onChange={handleChange}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          onBlur={handleBlurInternal}
          disabled={disabled}
          placeholder={
            hasLocation
              ? "Số nhà, tên đường (hoặc chọn gợi ý)..."
              : (placeholder ?? "Chọn Tỉnh/Thành, Quận/Huyện trước")
          }
          rows={1}
          className="max-h-16 min-h-[22px] min-w-0 flex-1 resize-none bg-transparent text-sm font-medium leading-relaxed text-on-surface outline-none placeholder:text-on-surface-variant/40"
          autoComplete="off"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={showList}
        />
        {inputValue && (
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              onChange("");
              setInputValue("");
              setSuggestions([]);
              setIsOpen(false);
              inputRef.current?.focus();
            }}
            className="mt-0.5 flex-shrink-0 rounded-full p-1 text-on-surface-variant/40 transition-colors hover:bg-surface-container-high hover:text-on-surface"
          >
            <X size={14} />
          </button>
        )}
        {loading && (
          <span className="loading loading-spinner loading-xs mt-1 text-primary" />
        )}
      </div>

      {showList && (
        <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 overflow-hidden rounded-2xl border border-outline-variant/30 bg-surface p-1.5 shadow-2xl">
          <div className="flex items-center gap-1.5 border-b border-outline-variant/10 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-on-surface-variant">
            <Sparkles size={12} className="text-primary" />
            <span>Gợi ý địa chỉ tại {ward || district || "khu vực"}</span>
          </div>
          <ul role="listbox" className="max-h-56 space-y-0.5 overflow-y-auto">
            {suggestions.map((s, i) => {
              const isSelected = i === activeIdx;
              const { main, sub } = formatAddressParts(s.place_name);

              return (
                <li
                  key={s.place_id ?? `${s.lat}-${s.lon}-${i}`}
                  role="option"
                  aria-selected={isSelected}
                  onMouseDown={(e) => {
                    e.preventDefault(); // prevent blur
                    select(i);
                  }}
                  onMouseEnter={() => setActiveIdx(i)}
                  className={clsx(
                    "flex cursor-pointer items-start gap-2.5 rounded-xl px-3 py-2 text-left transition-all",
                    isSelected
                      ? "bg-primary/10 text-primary"
                      : "text-on-surface hover:bg-surface-container/70"
                  )}
                >
                  <div
                    className={clsx(
                      "mt-0.5 grid h-6 w-6 flex-shrink-0 place-items-center rounded-lg transition-colors",
                      isSelected
                        ? "bg-primary text-surface"
                        : "bg-surface-container text-on-surface-variant"
                    )}
                  >
                    <MapPin size={13} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold leading-snug">{main}</p>
                    {sub && (
                      <p className="mt-0.5 truncate text-[11px] text-on-surface-variant">
                        {sub}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="border-t border-outline-variant/10 bg-surface-container-low/70 px-3 py-2 text-[11px] leading-relaxed text-on-surface-variant">
            <span className="font-bold text-primary">💡 Mẹo: </span>
            Nếu không có địa chỉ chính xác, bạn có thể chọn địa điểm gần đó nhất
            và thêm số nhà tại ô <strong>Ghi chú giao hàng</strong>.
          </div>
        </div>
      )}
    </div>
  );
}
