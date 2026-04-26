"use client";

import { DISTRICT_MAP, VIETNAM_CITIES } from "@/constants/vietnam-cities";
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
			(name) => VIETNAM_CITIES.find((c) => c.name === name)!,
		).filter(Boolean);
		const rest = VIETNAM_CITIES.filter(
			(c) => !PINNED_CITIES.includes(c.name),
		);
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
			const dropdown = document.getElementById(
				"city-search-dropdown-portal",
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
		return () =>
			document.removeEventListener("mousedown", handleClickOutside);
	}, [open, onBlur]);

	const inputDisplay = open ? search : value;

	return (
		<div ref={triggerRef}>
			<div
				className={clsx(
					"flex items-center gap-3 bg-surface-container rounded-2xl px-4 py-3.5 border-2 transition-all",
					hasError
						? "border-error"
						: open
							? "border-primary"
							: "border-transparent",
				)}>
				<Building2
					size={20}
					className={clsx(
						"flex-shrink-0",
						hasError ? "text-error" : "text-outline-variant",
					)}
				/>
				<input
					type="text"
					value={inputDisplay}
					onChange={handleInputChange}
					onFocus={handleOpen}
					placeholder={placeholder}
					disabled={disabled}
					className="flex-1 bg-transparent outline-none text-on-surface placeholder:text-on-surface-variant/40 font-medium text-sm min-w-0 disabled:opacity-50"
				/>
				{value && !open && (
					<CheckCircle2
						size={16}
						className="text-primary flex-shrink-0"
					/>
				)}
				{open ? (
					<ChevronUp
						size={16}
						className="text-outline-variant flex-shrink-0"
					/>
				) : (
					<ChevronDown
						size={16}
						className="text-outline-variant flex-shrink-0"
					/>
				)}
			</div>

			{open &&
				createPortal(
					<div
						id="city-search-dropdown-portal"
						style={dropdownStyle}
						className="bg-surface rounded-2xl shadow-xl border border-outline-variant/20 max-h-52 overflow-y-auto">
						{filteredCities.length === 0 ? (
							<p className="px-4 py-3 text-sm text-on-surface-variant">
								Không tìm thấy kết quả
							</p>
						) : (
							filteredCities.map((c, idx) => {
								const isPinned = PINNED_CITIES.includes(c.name);
								const prevIsPinned =
									idx > 0 &&
									PINNED_CITIES.includes(
										filteredCities[idx - 1].name,
									);
								const showDivider =
									!isPinned && prevIsPinned && !search.trim();

								return (
									<div key={c.code}>
										{showDivider && (
											<div className="mx-3 my-1 h-px bg-outline-variant/20" />
										)}
										<button
											type="button"
											onMouseDown={(e) =>
												e.preventDefault()
											}
											onClick={() => handleSelect(c.name)}
											className={clsx(
												"w-full text-left px-4 py-2.5 text-sm hover:bg-surface-container transition-colors",
												c.name === value &&
													"font-bold text-primary bg-primary/5",
											)}>
											{isPinned && (
												<span className="text-[9px] font-black text-primary bg-primary/10 rounded px-1 mr-2 uppercase">
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
					document.body,
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
				"district-search-dropdown-portal",
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
		return () =>
			document.removeEventListener("mousedown", handleClickOutside);
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
					"flex items-center gap-3 bg-surface-container rounded-2xl px-4 py-3.5 border-2 transition-all",
					isDisabled && "opacity-60",
					hasError
						? "border-error"
						: open
							? "border-primary"
							: "border-transparent",
				)}>
				<MapPin
					size={20}
					className={clsx(
						"flex-shrink-0",
						hasError ? "text-error" : "text-outline-variant",
					)}
				/>
				<input
					type="text"
					value={inputDisplay}
					onChange={handleInputChange}
					onFocus={handleOpen}
					placeholder={getPlaceholderText()}
					disabled={isDisabled}
					className="flex-1 bg-transparent outline-none text-on-surface placeholder:text-on-surface-variant/40 font-medium text-sm min-w-0 disabled:cursor-not-allowed"
				/>
				{value && !open && (
					<CheckCircle2
						size={16}
						className="text-primary flex-shrink-0"
					/>
				)}
				{!isDisabled &&
					(open ? (
						<ChevronUp
							size={16}
							className="text-outline-variant flex-shrink-0"
						/>
					) : (
						<ChevronDown
							size={16}
							className="text-outline-variant flex-shrink-0"
						/>
					))}
			</div>

			{open &&
				createPortal(
					<div
						id="district-search-dropdown-portal"
						style={dropdownStyle}
						className="bg-surface rounded-2xl shadow-xl border border-outline-variant/20 max-h-52 overflow-y-auto">
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
										"w-full text-left px-4 py-2.5 text-sm hover:bg-surface-container transition-colors",
										d.name === value &&
											"font-bold text-primary bg-primary/5",
									)}>
									<span className="text-[9px] font-bold text-on-surface-variant/60 uppercase mr-2">
										{d.type}
									</span>
									{d.name}
								</button>
							))
						)}
					</div>,
					document.body,
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
		[cityValue],
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
				<label className="block text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-2 ml-1">
					Tỉnh / Thành phố{" "}
					<span className="text-primary normal-case">*</span>
				</label>
				<CitySearchInput
					value={cityValue}
					onChange={handleCityChange}
					onBlur={onCityBlur ?? (() => {})}
					disabled={disabled}
					hasError={cityError}
				/>
				{cityError && cityErrorMessage && (
					<p className="text-error text-[10px] font-bold mt-1 ml-1">
						{cityErrorMessage}
					</p>
				)}
			</div>

			<div>
				<label className="block text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-2 ml-1">
					Phường / Quận / Huyện{" "}
					<span className="text-primary normal-case">*</span>
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
					<p className="text-error text-[10px] font-bold mt-1 ml-1">
						{districtErrorMessage}
					</p>
				)}
			</div>
		</div>
	);
}
