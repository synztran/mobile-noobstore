"use client";

import { DISTRICT_MAP, VIETNAM_CITIES } from "@/constants/vietnam-cities";
import { useAuth } from "@/lib/auth/AuthProvider";
import { toast } from "@/lib/toast";
import { useCartStore, useCheckoutStore } from "@/store";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

type DeliverySpeed = "standard" | "express" | "shipment";
const OPEN_WORKING = {
	startAt: "09:00",
	endAt: "18:00",
	days: [1, 2, 3, 4, 5], // Monday to Friday
};

type FormData = {
	fullName: string;
	streetAddress: string;
	apartment: string;
	city: string;
	cityCode: string;
	wardDistrict: string;
	wardDistrictCode: string;
	postalCode: string;
	phoneNumber: string;
};

type AddressLike = {
	full_name?: string;
	fullName?: string;
	address?: string;
	phone_number?: string;
	phoneNumber?: string;
	city?: string;
	city_code?: string;
	cityCode?: string;
	ward_district?: string;
	wardDistrict?: string;
	ward_district_code?: string;
	wardDistrictCode?: string;
	is_default?: boolean;
	isDefault?: boolean;
};

type FeesConfigResponse = {
	delivery_immediate_price: number;
	delivery_basic_price: number;
	insurance_fee: number;
	packing_fee: number;
	handling_fee: number;
	updated_at: string | null;
};

const HCM_CITY = "Thành phố Hồ Chí Minh";

const HCM_DISTRICT_SURCHARGE_RATE: Record<string, number> = {
	HCM_Q1: 0.2,
	HCM_Q3: 0.2,
	HCM_BT: 0.2,
	HCM_PN: 0.2,
	HCM_Q4: 0.3,
	HCM_Q5: 0.3,
	HCM_Q6: 0.3,
	HCM_Q7: 0.3,
	HCM_Q9: 0.3,
	HCM_Q10: 0.3,
	HCM_Q11: 0.3,
	HCM_TB: 0.3,
	HCM_Q2: 0.3,
	HCM_GV: 0.3,
	HCM_Q8: 0.4,
	HCM_Q12: 0.45,
	HCM_TP: 0.45,
	HCM_BC: 0.55,
	HCM_HM: 0.55,
	HCM_CC: 0.65,
	HCM_NB: 0.7,
	HCM_CG: 0.85,
};

function getDistrictShippingSurchargeRate(city: string, districtCode: string) {
	if (city !== HCM_CITY || !districtCode) return 0;
	return HCM_DISTRICT_SURCHARGE_RATE[districtCode] ?? 0;
}

function calculateShippingFeeWithSurcharge(
	baseFee: number,
	surchargeRate: number,
) {
	if (surchargeRate <= 0) return baseFee;
	return Math.round(baseFee * (1 + surchargeRate));
}

function getOperationalSurchargeRate(now = new Date()) {
	const currentDay = now.getDay();
	const isOutsideWorkingDays = !OPEN_WORKING.days.includes(currentDay);

	const [startHour, startMinute] = OPEN_WORKING.startAt
		.split(":")
		.map(Number);
	const [endHour, endMinute] = OPEN_WORKING.endAt.split(":").map(Number);

	const currentMinutes = now.getHours() * 60 + now.getMinutes();
	const startMinutes = startHour * 60 + startMinute;
	const endMinutes = endHour * 60 + endMinute;
	const isOutsideWorkingHours =
		currentMinutes < startMinutes || currentMinutes > endMinutes;

	let surchargeRate = 0;
	if (isOutsideWorkingHours) surchargeRate += 0.15;
	if (isOutsideWorkingDays) surchargeRate += 0.15;

	return surchargeRate;
}

const FORM_FIELD_NAMES = [
	"fullName",
	"streetAddress",
	"apartment",
	"city",
	"cityCode",
	"wardDistrict",
	"wardDistrictCode",
	"postalCode",
	"phoneNumber",
] as const;

const REQUIRED_FIELDS = ["fullName", "streetAddress", "city"] as const;

export function useShippingForm() {
	const router = useRouter();
	const { setShipping, shipping } = useCheckoutStore();
	const { total, cartId } = useCartStore();
	const { profile, user } = useAuth();

	const [mounted, setMounted] = useState(false);
	const [delivery, setDelivery] = useState<DeliverySpeed>("standard");
	const [cityTouched, setCityTouched] = useState(false);
	const [baseImmediateFee, setBaseImmediateFee] = useState(80000);
	const [baseBasicFee, setBaseBasicFee] = useState(40000);
	const [touched, setTouched] = useState<Partial<Record<string, boolean>>>(
		{},
	);
	const [form, setForm] = useState<FormData>({
		fullName:
			[profile?.first_name, profile?.last_name]
				.filter(Boolean)
				.join(" ") ?? "",
		streetAddress: "",
		apartment: "",
		city: "",
		cityCode: "",
		wardDistrict: "",
		wardDistrictCode: "",
		postalCode: "",
		phoneNumber: profile?.phone_number ?? "",
	});

	const getCityCode = useCallback((cityName: string) => {
		return VIETNAM_CITIES.find((c) => c.name === cityName)?.code ?? "";
	}, []);

	const getDistrictCode = useCallback(
		(cityCode: string, districtName: string) => {
			if (!cityCode) return "";
			const districts = DISTRICT_MAP[cityCode] ?? [];
			return districts.find((d) => d.name === districtName)?.code ?? "";
		},
		[],
	);

	const addressFromUser = useMemo(() => {
		const metadata = user?.user_metadata as
			| Record<string, unknown>
			| undefined;

		const rawFromUser = metadata?.addresses;
		const rawFromProfile = (profile as { addresses?: unknown } | null)
			?.addresses;
		const rawAddresses =
			Array.isArray(rawFromUser) && rawFromUser.length > 0
				? rawFromUser
				: rawFromProfile;

		if (!Array.isArray(rawAddresses)) return null;

		const normalized = rawAddresses
			.map((item) => {
				if (!item || typeof item !== "object") return null;
				return item as AddressLike;
			})
			.filter((item): item is AddressLike => item !== null);

		if (normalized.length === 0) return null;

		return (
			normalized.find((addr) => addr.is_default || addr.isDefault) ??
			normalized[0]
		);
	}, [profile, user]);

	useEffect(() => {
		setMounted(true);
	}, []);

	const fetchFeesConfig = useCallback(async () => {
		try {
			const res = await fetch("/api/fees", {
				credentials: "include",
			});

			if (!res.ok) return;

			const data = (await res.json()) as Partial<FeesConfigResponse>;

			if (typeof data.delivery_immediate_price === "number") {
				setBaseImmediateFee(data.delivery_immediate_price);
			}

			if (typeof data.delivery_basic_price === "number") {
				setBaseBasicFee(data.delivery_basic_price);
			}
		} catch {
			// Keep default local fallback fees when endpoint fails.
		}
	}, []);

	useEffect(() => {
		void fetchFeesConfig();
	}, [fetchFeesConfig]);

	useEffect(() => {
		setForm((prev) => ({
			...prev,
			fullName:
				shipping?.fullName ??
				addressFromUser?.full_name ??
				addressFromUser?.fullName ??
				[profile?.first_name, profile?.last_name]
					.filter(Boolean)
					.join(" ") ??
				"",
			phoneNumber:
				shipping?.phoneNumber ??
				addressFromUser?.phone_number ??
				addressFromUser?.phoneNumber ??
				profile?.phone_number ??
				"",
			city: shipping?.city ?? addressFromUser?.city ?? "",
			cityCode:
				shipping?.cityCode ??
				addressFromUser?.city_code ??
				addressFromUser?.cityCode ??
				getCityCode(shipping?.city ?? addressFromUser?.city ?? ""),
			wardDistrict:
				shipping?.wardDistrict ??
				addressFromUser?.ward_district ??
				addressFromUser?.wardDistrict ??
				"",
			wardDistrictCode:
				shipping?.wardDistrictCode ??
				addressFromUser?.ward_district_code ??
				addressFromUser?.wardDistrictCode ??
				getDistrictCode(
					shipping?.cityCode ??
						addressFromUser?.city_code ??
						addressFromUser?.cityCode ??
						getCityCode(
							shipping?.city ?? addressFromUser?.city ?? "",
						),
					shipping?.wardDistrict ??
						addressFromUser?.ward_district ??
						addressFromUser?.wardDistrict ??
						"",
				),
			apartment: shipping?.apartment ?? "",
			postalCode: shipping?.postalCode ?? "",
			streetAddress:
				shipping?.streetAddress ?? addressFromUser?.address ?? "",
		}));
	}, [addressFromUser, getCityCode, getDistrictCode, profile, shipping]);

	const handleChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
		},
		[],
	);

	const handleBlur = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
		setTouched((prev) => ({ ...prev, [e.target.name]: true }));
	}, []);

	const handleCityChange = useCallback(
		(city: string) => {
			const cityCode = getCityCode(city);
			setForm((prev) => ({
				...prev,
				city,
				cityCode,
				wardDistrict: city !== prev.city ? "" : prev.wardDistrict,
				wardDistrictCode:
					city !== prev.city ? "" : prev.wardDistrictCode,
			}));
			if (city !== HCM_CITY) {
				setDelivery("shipment");
			} else if (delivery === "shipment") {
				setDelivery("standard");
			}
		},
		[delivery, getCityCode],
	);

	const isInvalid = useCallback(
		(fieldName: string, required: boolean) =>
			required &&
			touched[fieldName] &&
			!String(form[fieldName as keyof FormData] ?? "").trim(),
		[form, touched],
	);

	const handleSubmit = useCallback(
		(e: React.FormEvent) => {
			e.preventDefault();

			const allTouched = Object.fromEntries(
				FORM_FIELD_NAMES.map((name) => [name, true]),
			) as Record<string, boolean>;
			setTouched(allTouched);
			setCityTouched(true);

			const missingRequired = REQUIRED_FIELDS.some((field) => {
				if (field === "city") return !form.city.trim();
				return !form[field].trim();
			});

			if (missingRequired) {
				toast.error("Vui lòng điền đầy đủ thông tin bắt buộc");
				return;
			}

			setShipping(
				{
					...form,
					deliverySpeed: delivery,
					shippingMethodId: delivery,
				},
				shippingCost,
			);
			router.push(
				cartId ? `/checkout/summary/${cartId}` : "/checkout/summary",
			);
		},
		[cartId, delivery, form, router, setShipping],
	);

	const subtotal = mounted ? total() : 0;
	const isHCM = form.city && form.city === HCM_CITY;
	const districtSurchargeRate = getDistrictShippingSurchargeRate(
		form.city,
		form.wardDistrictCode,
	);
	const operationalSurchargeRate = getOperationalSurchargeRate();
	const immediateFee = calculateShippingFeeWithSurcharge(
		baseImmediateFee,
		districtSurchargeRate + operationalSurchargeRate,
	);
	const basicFee = calculateShippingFeeWithSurcharge(
		baseBasicFee,
		districtSurchargeRate + operationalSurchargeRate,
	);
	const baseShippingCost = delivery === "express" ? immediateFee : basicFee;
	const shippingCost = baseShippingCost;
	const orderTotal = subtotal + shippingCost;

	return {
		form,
		setForm,
		touched,
		cityTouched,
		setCityTouched,
		delivery,
		setDelivery,
		handleChange,
		handleBlur,
		handleCityChange,
		isInvalid,
		handleSubmit,
		isHCM,
		subtotal,
		shippingCost,
		baseShippingCost,
		districtSurchargeRate,
		operationalSurchargeRate,
		orderTotal,
		baseImmediateFee,
		baseBasicFee,
		immediateFee,
		basicFee,
	};
}
