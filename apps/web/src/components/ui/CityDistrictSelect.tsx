"use client";

import { DISTRICT_MAP, VIETNAM_CITIES } from "@/constants/vietnam-cities";
import { getWards, WardUnit } from "@/lib/address/wards";
import clsx from "clsx";
import {
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  MapPin,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

const PINNED_CITIES = ["Thành phố Hồ Chí Minh", "Thành phố Hà Nội"];

// ── CitySearchInput ────────────────────────────────────────────────────────────

export type CitySearchInputProps = {
  value: string;
  onChange: (city: string) => void;
  onCodeChange?: (cityCode: string) => void;
  onBlur: () => void;
  disabled: boolean;
  hasError: boolean;
  placeholder?: string;
};

export function CitySearchInput({
  value,
  onChange,
  onCodeChange,
  onBlur,
  disabled,
  hasError,
  placeholder = "Tìm tỉnh / thành phố...",
}: CitySearchInputProps) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const triggerRef = useRef<HTMLDivElement>(null);

  const sortedCities = useMemo(() => {
    const pinned = PINNED_CITIES.map(
      (name) => VIETNAM_CITIES.find((c) => c.name === name)!
    ).filter(Boolean);
    const rest = VIETNAM_CITIES.filter((c) => !PINNED_CITIES.includes(c.name));
    return [...pinned, ...rest];
  }, []);

  const filteredCities = useMemo(() => {
    if (!search.trim()) return sortedCities;
    const q = search.toLowerCase();
    return sortedCities.filter((c) => c.name.toLowerCase().includes(q));
  }, [search, sortedCities]);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setDropdownStyle({
      position: "fixed",
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
      zIndex: 9999,
    });
  }, []);

  const handleOpen = () => {
    if (disabled) return;
    updatePosition();
    setOpen(true);
  };

  const handleSelect = (cityName: string) => {
    const selectedCity = VIETNAM_CITIES.find((c) => c.name === cityName);
    onChange(cityName);
    if (selectedCity && onCodeChange) {
      onCodeChange(selectedCity.code);
    }
    setSearch("");
    setOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    if (value) onChange("");
    updatePosition();
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      const dropdown = document.getElementById("city-search-dropdown-portal");
      const target = e.target as Node;
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        dropdown &&
        !dropdown.contains(target)
      ) {
        setOpen(false);
        onBlur();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open, onBlur]);

  const inputDisplay = open ? search : value;

  return (
    <div ref={triggerRef}>
      <div
        className={clsx(
          "flex items-center gap-3 rounded-2xl border-2 bg-surface-container px-4 py-3.5 transition-all",
          hasError
            ? "border-error"
            : open
              ? "border-primary"
              : "border-transparent"
        )}
      >
        <Building2
          size={20}
          className={clsx(
            "flex-shrink-0",
            hasError ? "text-error" : "text-outline-variant"
          )}
        />
        <input
          type="text"
          value={inputDisplay}
          onChange={handleInputChange}
          onFocus={handleOpen}
          placeholder={placeholder}
          disabled={disabled}
          className="min-w-0 flex-1 bg-transparent text-sm font-medium text-on-surface outline-none placeholder:text-on-surface-variant/40 disabled:opacity-50"
        />
        {value && !open && (
          <CheckCircle2 size={16} className="flex-shrink-0 text-primary" />
        )}
        {open ? (
          <ChevronUp size={16} className="flex-shrink-0 text-outline-variant" />
        ) : (
          <ChevronDown
            size={16}
            className="flex-shrink-0 text-outline-variant"
          />
        )}
      </div>

      {open &&
        createPortal(
          <div
            id="city-search-dropdown-portal"
            style={dropdownStyle}
            className="max-h-52 overflow-y-auto rounded-2xl border border-outline-variant/20 bg-surface shadow-xl"
          >
            {filteredCities.length === 0 ? (
              <p className="px-4 py-3 text-sm text-on-surface-variant">
                Không tìm thấy kết quả
              </p>
            ) : (
              filteredCities.map((c, idx) => {
                const isPinned = PINNED_CITIES.includes(c.name);
                const prevIsPinned =
                  idx > 0 &&
                  PINNED_CITIES.includes(filteredCities[idx - 1].name);
                const showDivider = !isPinned && prevIsPinned && !search.trim();

                return (
                  <div key={c.code}>
                    {showDivider && (
                      <div className="mx-3 my-1 h-px bg-outline-variant/20" />
                    )}
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handleSelect(c.name)}
                      className={clsx(
                        "w-full px-4 py-2.5 text-left text-sm transition-colors hover:bg-surface-container",
                        c.name === value &&
                          "bg-primary/5 font-bold text-primary"
                      )}
                    >
                      {isPinned && (
                        <span className="mr-2 rounded bg-primary/10 px-1 text-[9px] font-black uppercase text-primary">
                          Phổ biến
                        </span>
                      )}
                      {c.name}
                    </button>
                  </div>
                );
              })
            )}
          </div>,
          document.body
        )}
    </div>
  );
}

// ── DistrictSearchInput ────────────────────────────────────────────────────────

export type DistrictSearchInputProps = {
  value: string;
  onChange: (district: string) => void;
  onCodeChange?: (districtCode: string) => void;
  onBlur: () => void;
  disabled: boolean;
  hasError: boolean;
  cityCode: string | null;
  placeholder?: string;
};

export function DistrictSearchInput({
  value,
  onChange,
  onCodeChange,
  onBlur,
  disabled,
  hasError,
  cityCode,
  placeholder = "Tìm phường / quận / huyện...",
}: DistrictSearchInputProps) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const triggerRef = useRef<HTMLDivElement>(null);

  const districts = useMemo(() => {
    if (!cityCode) return [];
    return DISTRICT_MAP[cityCode] ?? [];
  }, [cityCode]);

  const filteredDistricts = useMemo(() => {
    if (!search.trim()) return districts;
    const q = search.toLowerCase();
    return districts.filter((d) => d.name.toLowerCase().includes(q));
  }, [search, districts]);

  const isDisabled = disabled || !cityCode || districts.length === 0;

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setDropdownStyle({
      position: "fixed",
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
      zIndex: 9999,
    });
  }, []);

  const handleOpen = () => {
    if (isDisabled) return;
    updatePosition();
    setOpen(true);
  };

  const handleSelect = (districtName: string) => {
    const selectedDistrict = districts.find((d) => d.name === districtName);
    onChange(districtName);
    if (selectedDistrict && onCodeChange) {
      onCodeChange(selectedDistrict.code);
    }
    setSearch("");
    setOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    if (value) onChange("");
    updatePosition();
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      const dropdown = document.getElementById(
        "district-search-dropdown-portal"
      );
      const target = e.target as Node;
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        dropdown &&
        !dropdown.contains(target)
      ) {
        setOpen(false);
        onBlur();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open, onBlur]);

  const inputDisplay = open ? search : value;

  const getPlaceholderText = () => {
    if (!cityCode) return "Vui lòng chọn tỉnh / thành phố trước";
    if (districts.length === 0) return "Không có dữ liệu";
    return placeholder;
  };

  return (
    <div ref={triggerRef}>
      <div
        className={clsx(
          "flex items-center gap-3 rounded-2xl border-2 bg-surface-container px-4 py-3.5 transition-all",
          isDisabled && "opacity-60",
          hasError
            ? "border-error"
            : open
              ? "border-primary"
              : "border-transparent"
        )}
      >
        <MapPin
          size={20}
          className={clsx(
            "flex-shrink-0",
            hasError ? "text-error" : "text-outline-variant"
          )}
        />
        <input
          type="text"
          value={inputDisplay}
          onChange={handleInputChange}
          onFocus={handleOpen}
          placeholder={getPlaceholderText()}
          disabled={isDisabled}
          className="min-w-0 flex-1 bg-transparent text-sm font-medium text-on-surface outline-none placeholder:text-on-surface-variant/40 disabled:cursor-not-allowed"
        />
        {value && !open && (
          <CheckCircle2 size={16} className="flex-shrink-0 text-primary" />
        )}
        {!isDisabled &&
          (open ? (
            <ChevronUp
              size={16}
              className="flex-shrink-0 text-outline-variant"
            />
          ) : (
            <ChevronDown
              size={16}
              className="flex-shrink-0 text-outline-variant"
            />
          ))}
      </div>

      {open &&
        createPortal(
          <div
            id="district-search-dropdown-portal"
            style={dropdownStyle}
            className="max-h-52 overflow-y-auto rounded-2xl border border-outline-variant/20 bg-surface shadow-xl"
          >
            {filteredDistricts.length === 0 ? (
              <p className="px-4 py-3 text-sm text-on-surface-variant">
                Không tìm thấy kết quả
              </p>
            ) : (
              filteredDistricts.map((d, idx) => (
                <button
                  key={idx}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSelect(d.name)}
                  className={clsx(
                    "w-full px-4 py-2.5 text-left text-sm transition-colors hover:bg-surface-container",
                    d.name === value && "bg-primary/5 font-bold text-primary"
                  )}
                >
                  <span className="mr-2 text-[9px] font-bold uppercase text-on-surface-variant/60">
                    {d.type}
                  </span>
                  {d.name}
                </button>
              ))
            )}
          </div>,
          document.body
        )}
    </div>
  );
}

// ── WardSearchInput ────────────────────────────────────────────────────────

export type WardSearchInputProps = {
  value: string;
  onChange: (ward: string) => void;
  onCodeChange?: (wardCode: string) => void;
  onBlur: () => void;
  disabled: boolean;
  hasError: boolean;
  cityName: string | null;
  districtName: string;
  placeholder?: string;
};

export function WardSearchInput({
  value,
  onChange,
  onCodeChange,
  onBlur,
  disabled,
  hasError,
  cityName,
  districtName,
  placeholder = "Tìm phường / xã...",
}: WardSearchInputProps) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const [options, setOptions] = useState<WardUnit[]>([]);
  const [loading, setLoading] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setDropdownStyle({
      position: "fixed",
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
      zIndex: 9999,
    });
  }, []);

  const loadOptions = useCallback(async () => {
    if (!cityName || !districtName) {
      setOptions([]);
      return;
    }
    setLoading(true);
    try {
      const list = await getWards(cityName, districtName);
      setOptions(list);
    } catch {
      setOptions([]);
    } finally {
      setLoading(false);
    }
  }, [cityName, districtName]);

  useEffect(() => {
    void loadOptions();
  }, [loadOptions]);

  const handleOpen = () => {
    if (disabled) return;
    updatePosition();
    setOpen(true);
  };

  const handleSelect = (ward: WardUnit) => {
    onChange(ward.name);
    if (onCodeChange) onCodeChange(ward.code);
    setSearch("");
    setOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    if (value) onChange("");
    updatePosition();
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      const dropdown = document.getElementById("ward-search-dropdown-portal");
      const target = e.target as Node;
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        dropdown &&
        !dropdown.contains(target)
      ) {
        setOpen(false);
        onBlur();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open, onBlur]);

  const inputDisplay = open ? search : value;
  const filtered =
    (search.trim()
      ? options.filter((o) =>
          o.name.toLowerCase().includes(search.toLowerCase())
        )
      : options) ?? [];

  const getPlaceholderText = () => {
    if (!cityName) return "Vui lòng chọn tỉnh / thành phố trước";
    if (!districtName) return "Vui lòng chọn quận / huyện trước";
    if (loading) return "Đang tải...";
    if (filtered.length === 0) return "Không có dữ liệu";
    return placeholder;
  };

  return (
    <div ref={triggerRef}>
      <div
        className={clsx(
          "flex items-center gap-3 rounded-2xl border-2 bg-surface-container px-4 py-3.5 transition-all",
          disabled && "opacity-60",
          hasError
            ? "border-error"
            : open
              ? "border-primary"
              : "border-transparent"
        )}
      >
        <MapPin
          size={20}
          className={clsx(
            "flex-shrink-0",
            hasError ? "text-error" : "text-outline-variant"
          )}
        />
        <input
          type="text"
          value={inputDisplay}
          onChange={handleInputChange}
          onFocus={handleOpen}
          placeholder={getPlaceholderText()}
          disabled={disabled || !cityName || !districtName}
          className="min-w-0 flex-1 bg-transparent text-sm font-medium text-on-surface outline-none placeholder:text-on-surface-variant/40 disabled:cursor-not-allowed"
        />
        {value && !open && (
          <CheckCircle2 size={16} className="flex-shrink-0 text-primary" />
        )}
        {!disabled &&
          (open ? (
            <ChevronUp
              size={16}
              className="flex-shrink-0 text-outline-variant"
            />
          ) : (
            <ChevronDown
              size={16}
              className="flex-shrink-0 text-outline-variant"
            />
          ))}
      </div>

      {open &&
        createPortal(
          <div
            id="ward-search-dropdown-portal"
            style={dropdownStyle}
            className="max-h-52 overflow-y-auto rounded-2xl border border-outline-variant/20 bg-surface shadow-xl"
          >
            {filtered.length === 0 ? (
              <p className="px-4 py-3 text-sm text-on-surface-variant">
                Không tìm thấy kết quả
              </p>
            ) : (
              filtered.map((w) => (
                <button
                  key={w.code}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSelect(w)}
                  className={clsx(
                    "w-full px-4 py-2.5 text-left text-sm transition-colors hover:bg-surface-container",
                    w.name === value && "bg-primary/5 font-bold text-primary"
                  )}
                >
                  {w.name}
                </button>
              ))
            )}
          </div>,
          document.body
        )}
    </div>
  );
}

// ── CityDistrictSelect ─────────────────────────────────────────────────────────
// Combined component: city select + district select (district depends on city)

export type CityDistrictSelectProps = {
  cityValue: string;
  districtValue: string;
  onCityChange: (city: string) => void;
  onDistrictChange: (district: string) => void;
  onCityBlur?: () => void;
  onDistrictBlur?: () => void;
  cityError?: boolean;
  districtError?: boolean;
  disabled?: boolean;
  cityErrorMessage?: string;
  districtErrorMessage?: string;
};

export function CityDistrictSelect({
  cityValue,
  districtValue,
  onCityChange,
  onDistrictChange,
  onCityBlur,
  onDistrictBlur,
  cityError = false,
  districtError = false,
  disabled = false,
  cityErrorMessage,
  districtErrorMessage,
}: CityDistrictSelectProps) {
  const cityCode = useMemo(
    () => VIETNAM_CITIES.find((c) => c.name === cityValue)?.code ?? null,
    [cityValue]
  );

  const handleCityChange = (city: string) => {
    onCityChange(city);
    // Reset district when city changes
    if (city !== cityValue) {
      onDistrictChange("");
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-2 ml-1 block text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
          Tỉnh / Thành phố <span className="normal-case text-primary">*</span>
        </label>
        <CitySearchInput
          value={cityValue}
          onChange={handleCityChange}
          onBlur={onCityBlur ?? (() => {})}
          disabled={disabled}
          hasError={cityError}
        />
        {cityError && cityErrorMessage && (
          <p className="ml-1 mt-1 text-[10px] font-bold text-error">
            {cityErrorMessage}
          </p>
        )}
      </div>

      <div>
        <label className="mb-2 ml-1 block text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
          Phường / Quận / Huyện{" "}
          <span className="normal-case text-primary">*</span>
        </label>
        <DistrictSearchInput
          value={districtValue}
          onChange={onDistrictChange}
          onBlur={onDistrictBlur ?? (() => {})}
          disabled={disabled}
          hasError={districtError}
          cityCode={cityCode}
        />
        {districtError && districtErrorMessage && (
          <p className="ml-1 mt-1 text-[10px] font-bold text-error">
            {districtErrorMessage}
          </p>
        )}
      </div>
    </div>
  );
}
