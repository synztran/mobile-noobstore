"use client";

import { DISTRICT_MAP, VIETNAM_CITIES } from "@/constants/vietnam-cities";
import {
  PICKUP_SLOT_MINUTES,
  dayEndMinutes,
  dayStartMinutes,
} from "@/lib/store-hours";
import { useAuth } from "@/modules/user/client/AuthProvider";
import { toast } from "@/lib/toast";
import { useCartStore } from "@/modules/cart/client/useCartStore";
import { useCheckoutStore } from "@/store";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type DeliverySpeed = "standard" | "express" | "shipment" | "pickup";

type FormData = {
  fullName: string;
  streetAddress: string;
  apartment: string;
  city: string;
  cityCode: string;
  district: string;
  ward: string;
  districtCode: string;
  wardCode: string;
  postalCode: string;
  phoneNumber: string;
  notes: string;
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
  district?: string;
  ward?: string;
  district_code?: string;
  ward_code?: string;
  districtCode?: string;
  wardCode?: string;
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
  surchargeRate: number
) {
  if (surchargeRate <= 0) return baseFee;
  return Math.round(baseFee * (1 + surchargeRate));
}

function getOperationalSurchargeRate(now = new Date()) {
  const currentDay = now.getDay();

  const startMinutes = dayStartMinutes(currentDay);
  const endMinutes = dayEndMinutes(currentDay);

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const isOutsideWorkingHours =
    currentMinutes < startMinutes || currentMinutes > endMinutes;

  let surchargeRate = 0;
  if (isOutsideWorkingHours) surchargeRate += 0.15;

  return surchargeRate;
}

const FORM_FIELD_NAMES = [
  "fullName",
  "streetAddress",
  "apartment",
  "city",
  "district",
  "ward",
  "cityCode",
  "districtCode",
  "wardCode",
  "postalCode",
  "phoneNumber",
] as const;

const REQUIRED_FIELDS = ["fullName", "streetAddress", "city"] as const;

export function useShippingForm() {
  const router = useRouter();
  const {
    setShipping,
    shipping,
    shippingFormDraft,
    saveShippingDraft,
    clearShippingDraft,
  } = useCheckoutStore();
  const { total, cartId, items: cartItems } = useCartStore();
  const hasPreOrder = useMemo(
    () =>
      cartItems.some(
        (i) => i.is_pre_order || i.components?.some((c) => c.is_pre_order)
      ),
    [cartItems]
  );
  const preOrderEstimate = useMemo(() => {
    for (const item of cartItems) {
      const config =
        item.pre_order_config ??
        item.components?.find((c) => c.pre_order_config)?.pre_order_config ??
        null;
      if (config?.estimate) return config.estimate;
    }
    return null;
  }, [cartItems]);
  const { profile, user } = useAuth();

  const [mounted, setMounted] = useState(false);
  const [ready, setReady] = useState(false);
  const [delivery, setDelivery] = useState<DeliverySpeed>("standard");
  const [pickupDate, setPickupDate] = useState("");
  const [pickupTime, setPickupTime] = useState("");
  const [cityTouched, setCityTouched] = useState(false);
  const [immediatePricePerKm, setImmediatePricePerKm] = useState(12000);
  const [basicPricePerKm, setBasicPricePerKm] = useState(5500);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [isCalculatingFee, setIsCalculatingFee] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [touched, setTouched] = useState<Partial<Record<string, boolean>>>({});
  const [form, setForm] = useState<FormData>({
    fullName:
      [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") ?? "",
    streetAddress: "",
    apartment: "",
    city: "",
    cityCode: "",
    district: "",
    ward: "",
    districtCode: "",
    wardCode: "",
    postalCode: "",
    phoneNumber: profile?.phone_number ?? "",
    notes: shipping?.notes ?? "",
  });
  const [customerLocation, setCustomerLocation] = useState<{
    lat: number;
    lon: number;
    label: string;
  } | null>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<[number, number][]>(
    []
  );
  const [storeCoords, setStoreCoords] = useState<{
    lat: number;
    lon: number;
  } | null>(null);
  const presetLatRef = useRef<number | undefined>();
  const presetLonRef = useRef<number | undefined>();

  const getCityCode = useCallback((cityName: string) => {
    return VIETNAM_CITIES.find((c) => c.name === cityName)?.code ?? "";
  }, []);

  const getDistrictCode = useCallback(
    (cityCode: string, districtName: string) => {
      if (!cityCode) return "";
      const districts = DISTRICT_MAP[cityCode] ?? [];
      return districts.find((d) => d.name === districtName)?.code ?? "";
    },
    []
  );

  const addressFromUser = useMemo(() => {
    const metadata = user?.user_metadata as Record<string, unknown> | undefined;

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

  const fetchedRef = useRef(false);
  const initializedRef = useRef(false);
  const restoredDeliveryRef = useRef(false);

  // Restore delivery method + pickup slot from a previously saved shipping step
  useEffect(() => {
    if (restoredDeliveryRef.current) return;
    if (!shipping || Object.keys(shipping).length === 0) return;

    restoredDeliveryRef.current = true;
    const speed = shipping.deliverySpeed;
    if (
      speed === "standard" ||
      speed === "express" ||
      speed === "shipment" ||
      speed === "pickup"
    ) {
      setDelivery(speed);
    }
    if (speed === "pickup" && shipping.pickupAt) {
      const d = new Date(shipping.pickupAt);
      if (!Number.isNaN(d.getTime())) {
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        setPickupDate(`${yyyy}-${mm}-${dd}`);
        setPickupTime(
          `${String(d.getHours()).padStart(2, "0")}:${String(
            d.getMinutes()
          ).padStart(2, "0")}`
        );
      }
    }
  }, [shipping]);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    fetch("/api/fees", { credentials: "include" })
      .then((res) => {
        if (!res.ok) return;
        return res.json() as Promise<Partial<FeesConfigResponse>>;
      })
      .then((data) => {
        if (!data) return;
        if (typeof data.delivery_immediate_price === "number") {
          setImmediatePricePerKm(data.delivery_immediate_price);
        }
        if (typeof data.delivery_basic_price === "number") {
          setBasicPricePerKm(data.delivery_basic_price);
        }
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (initializedRef.current) return;

    // Restore shipping form draft if available (higher priority than profile/shipping)
    if (shippingFormDraft) {
      initializedRef.current = true;
      setForm((prev) => ({
        ...prev,
        ...shippingFormDraft,
      }));
      return;
    }

    const hasProfile = !!profile;
    const hasAddress = !!addressFromUser;
    const hasShipping = !!shipping && Object.keys(shipping).length > 0;
    if (!hasProfile && !hasAddress && !hasShipping) return;

    initializedRef.current = true;

    setForm((prev) => ({
      ...prev,
      fullName:
        shipping?.fullName ??
        addressFromUser?.full_name ??
        addressFromUser?.fullName ??
        [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") ??
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
      district: shipping?.district ?? addressFromUser?.district ?? "",
      ward: shipping?.ward ?? addressFromUser?.ward ?? "",
      districtCode:
        shipping?.districtCode ??
        addressFromUser?.district_code ??
        addressFromUser?.districtCode ??
        getDistrictCode(
          shipping?.cityCode ??
            addressFromUser?.city_code ??
            addressFromUser?.cityCode ??
            getCityCode(shipping?.city ?? addressFromUser?.city ?? ""),
          shipping?.district ?? addressFromUser?.district ?? ""
        ),
      wardCode:
        shipping?.wardCode ??
        addressFromUser?.ward_code ??
        addressFromUser?.wardCode ??
        "",
      apartment: shipping?.apartment ?? "",
      postalCode: shipping?.postalCode ?? "",
      streetAddress: shipping?.streetAddress ?? addressFromUser?.address ?? "",
      notes: shipping?.notes ?? "",
    }));
  }, [addressFromUser, getCityCode, getDistrictCode, profile, shipping]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    },
    []
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
        streetAddress: city !== prev.city ? "" : prev.streetAddress,
        district: city !== prev.city ? "" : prev.district,
        districtCode: city !== prev.city ? "" : prev.districtCode,
        ward: city !== prev.city ? "" : prev.ward,
        wardCode: city !== prev.city ? "" : prev.wardCode,
      }));
      if (city !== HCM_CITY) {
        if (delivery === "standard" || delivery === "express") {
          setDelivery("shipment");
        }
      } else if (delivery === "shipment") {
        setDelivery("standard");
      }
    },
    [delivery, getCityCode]
  );

  const isInvalid = useCallback(
    (fieldName: string, required: boolean) =>
      required &&
      touched[fieldName] &&
      !String(form[fieldName as keyof FormData] ?? "").trim(),
    [form, touched]
  );

  const isPickupFieldInvalid = useCallback(
    (field: "pickupDate" | "pickupTime") =>
      touched[field] &&
      !String(field === "pickupDate" ? pickupDate : pickupTime).trim(),
    [touched, pickupDate, pickupTime]
  );

  const subtotal = mounted ? total() : 0;
  const isHCM = form.city && form.city === HCM_CITY;
  const districtSurchargeRate = getDistrictShippingSurchargeRate(
    form.city,
    form.districtCode
  );
  const operationalSurchargeRate = getOperationalSurchargeRate();

  const rawImmediateCost =
    distanceKm === null
      ? 0
      : Math.max(distanceKm * immediatePricePerKm, distanceKm <= 3 ? 50000 : 0);
  const rawBasicCost =
    distanceKm === null
      ? 0
      : Math.max(distanceKm * basicPricePerKm, distanceKm <= 3 ? 30000 : 0);
  const baseImmediateFee = rawImmediateCost;
  const baseBasicFee = rawBasicCost;
  const immediateFee = calculateShippingFeeWithSurcharge(
    baseImmediateFee,
    districtSurchargeRate + operationalSurchargeRate
  );
  const basicFee = calculateShippingFeeWithSurcharge(
    baseBasicFee,
    districtSurchargeRate + operationalSurchargeRate
  );
  const distanceFee = delivery === "express" ? rawImmediateCost : rawBasicCost;
  const isPickup = delivery === "pickup";
  const isDeliveryService = delivery === "shipment";
  const baseShippingCost = isPickup
    ? 0
    : isDeliveryService
      ? 0
      : delivery === "express"
        ? immediateFee
        : basicFee;
  const shippingCost = baseShippingCost;
  const orderTotal = subtotal + shippingCost;

  const earliestPreOrderPickupDate = useMemo(() => {
    let earliest: string | null = null;
    for (const item of cartItems) {
      const config =
        item.pre_order_config ??
        item.components?.find((c) => c.pre_order_config)?.pre_order_config ??
        null;
      if (config?.available_date) {
        if (!earliest || config.available_date < earliest) {
          earliest = config.available_date;
        }
      }
    }
    return earliest;
  }, [cartItems]);

  // Earliest allowed pickup date (YYYY-MM-DD): today (or tomorrow after close),
  // never before the earliest pre-order available date.
  const minPickupDate = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    let min = new Date(today);
    if (nowMinutes >= dayEndMinutes(now.getDay())) {
      min.setDate(min.getDate() + 1);
    }
    if (earliestPreOrderPickupDate) {
      const pre = new Date(earliestPreOrderPickupDate);
      if (!Number.isNaN(pre.getTime()) && pre.getTime() > min.getTime()) {
        min = pre;
      }
    }
    return `${min.getFullYear()}-${String(min.getMonth() + 1).padStart(2, "0")}-${String(min.getDate()).padStart(2, "0")}`;
  }, [earliestPreOrderPickupDate]);

  const pickupSlots = useMemo(() => {
    // Slots follow the schedule of the selected pickup day: weekdays end at
    // 19:00, weekends at 17:00. Falls back to today's window when no date is
    // picked yet.
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const isToday =
      pickupDate ===
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const day = pickupDate
      ? new Date(`${pickupDate}T00:00:00`).getDay()
      : now.getDay();
    const startMin = dayStartMinutes(day);
    const endMin = dayEndMinutes(day);
    const slots: string[] = [];
    for (let m = startMin; m <= endMin; m += PICKUP_SLOT_MINUTES) {
      // For today, hide slots that already started/are past (set after close is
      // already handled by rolling minPickupDate to tomorrow).
      if (isToday && m <= nowMinutes) continue;
      const h = Math.floor(m / 60);
      const min = m % 60;
      slots.push(
        `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`
      );
    }
    return slots;
  }, [pickupDate]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      if (isPickup) {
        setTouched((prev) => ({
          ...prev,
          fullName: true,
          phoneNumber: true,
          pickupDate: hasPreOrder ? prev.pickupDate : true,
          pickupTime: hasPreOrder ? prev.pickupTime : true,
        }));
        setCityTouched(false);

        if (!form.fullName.trim() || !form.phoneNumber.trim()) {
          toast.error("Vui lòng điền đầy đủ thông tin bắt buộc");
          return;
        }

        let pickupAt: string | null = null;

        if (!hasPreOrder) {
          if (!pickupDate || !pickupTime) {
            toast.error("Vui lòng điền đầy đủ thông tin bắt buộc");
            return;
          }

          const combined = new Date(`${pickupDate}T${pickupTime}:00`);
          if (
            Number.isNaN(combined.getTime()) ||
            combined.getTime() <= Date.now()
          ) {
            toast.error("Vui lòng chọn thời gian nhận hàng trong tương lai");
            return;
          }

          const slotDay = combined.getDay();
          const slotMin = combined.getHours() * 60 + combined.getMinutes();
          if (
            slotMin < dayStartMinutes(slotDay) ||
            slotMin > dayEndMinutes(slotDay)
          ) {
            toast.error("Giờ nhận hàng ngoài giờ mở cửa của cửa hàng");
            return;
          }

          pickupAt = combined.toISOString();
        }

        setIsSubmitting(true);
        clearShippingDraft();
        setShipping(
          {
            ...form,
            deliverySpeed: "pickup",
            shippingMethodId: "pickup",
            pickupAt,
          },
          0
        );
        router.push("/checkout/summary");
        return;
      }

      const allTouched = Object.fromEntries(
        FORM_FIELD_NAMES.map((name) => [name, true])
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

      setIsSubmitting(true);
      clearShippingDraft();
      setShipping(
        {
          ...form,
          deliverySpeed: delivery,
          shippingMethodId: delivery,
        },
        shippingCost
      );
      router.push("/checkout/summary");
    },
    [
      isPickup,
      delivery,
      form,
      pickupDate,
      pickupTime,
      router,
      setShipping,
      shippingCost,
    ]
  );

  const handleAddressSelect = useCallback(
    (address: string, lat?: number, lon?: number) => {
      setForm((prev) => ({ ...prev, streetAddress: address }));
      if (lat !== undefined && lon !== undefined) {
        presetLatRef.current = lat;
        presetLonRef.current = lon;
      }
    },
    []
  );

  // Parse combined `wardDistrict` and/or street text to extract `ward` + `district`.
  function splitWardDistrict(value?: string, street?: string) {
    const result: { ward?: string; district?: string } = {};
    if (value) {
      const parts = value
        .split(/[,\-–—]/)
        .map((p) => p.trim())
        .filter(Boolean);
      if (parts.length >= 2) {
        const first = parts[0];
        const second = parts[1];
        const f = first.toLowerCase();
        const s = second.toLowerCase();
        const wardKeywords = ["phường", "p.", "p ", "xã", "thị trấn"];
        const districtKeywords = [
          "quận",
          "huyện",
          "thị xã",
          "thành phố",
          "tp",
          "tp.",
        ];
        if (
          wardKeywords.some((k) => f.includes(k)) ||
          districtKeywords.some((k) => s.includes(k))
        ) {
          result.ward = first;
          result.district = second;
        } else if (
          districtKeywords.some((k) => f.includes(k)) ||
          wardKeywords.some((k) => s.includes(k))
        ) {
          result.district = first;
          result.ward = second;
        } else {
          result.ward = first;
          result.district = second;
        }
      } else {
        const low = value.toLowerCase();
        const districtKeywords = [
          "quận",
          "huyện",
          "thị xã",
          "thành phố",
          "tp",
          "tp.",
        ];
        const wardKeywords = ["phường", "p.", "p ", "xã", "thị trấn"];
        if (districtKeywords.some((k) => low.includes(k)))
          result.district = value;
        else if (wardKeywords.some((k) => low.includes(k))) result.ward = value;
        else result.district = value;
      }
    }

    if (!result.ward && street) {
      const parts = street.split(",").map((p) => p.trim());
      const wardPart = parts.find((p) =>
        /phường|p\.?\s*\d+|xã|thị trấn/i.test(p)
      );
      if (wardPart) result.ward = wardPart;
    }

    if (!result.district && value) result.district = value;

    return result;
  }

  // Keep the delivery method consistent with the selected city. This covers
  // restored drafts/shipping where the saved delivery no longer matches the
  // city (e.g. city changed back to HCM with delivery_service persisted).
  useEffect(() => {
    if (!form.city) return;
    if (form.city !== HCM_CITY) {
      if (delivery === "standard" || delivery === "express") {
        setDelivery("shipment");
      }
    } else if (delivery === "shipment") {
      setDelivery("standard");
    }
  }, [form.city, delivery]);

  // Update distance fee when address changes (debounced)
  useEffect(() => {
    let cancelled = false;
    if (delivery === "shipment" || delivery === "pickup") {
      setDistanceKm(null);
      setIsCalculatingFee(false);
      return;
    }
    const shouldCall =
      String(form.streetAddress).trim() &&
      String(form.city).trim() &&
      (String(form.district).trim() || String(form.ward).trim());
    if (!shouldCall) {
      setDistanceKm(null);
      setIsCalculatingFee(
        !!String(form.city).trim() &&
          !!(String(form.district).trim() || String(form.ward).trim())
      );
      return;
    }

    const id = setTimeout(async () => {
      if (!cancelled) setIsCalculatingFee(true);
      try {
        const sd = splitWardDistrict(
          form.district || form.ward || undefined,
          form.streetAddress
        );
        const body: Record<string, unknown> = {
          streetAddress: form.streetAddress,
          city: form.city,
          district: form.district || sd.district,
          ward: form.ward || sd.ward,
          wardDistrict:
            form.ward || form.district
              ? `${form.ward ? form.ward + ", " : ""}${form.district}`.trim()
              : undefined,
        };
        if (
          presetLatRef.current !== undefined &&
          presetLonRef.current !== undefined
        ) {
          body.lat = presetLatRef.current;
          body.lon = presetLonRef.current;
          presetLatRef.current = undefined;
          presetLonRef.current = undefined;
        }
        const res = await fetch("/api/shipping/distance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          if (!cancelled) {
            setDistanceKm(null);
          }
          return;
        }

        const data = await res.json();
        if (!cancelled) {
          setDistanceKm(
            typeof data.distance_km === "number" ? data.distance_km : null
          );
          setCustomerLocation({
            lat: typeof data.lat === "number" ? data.lat : 0,
            lon: typeof data.lon === "number" ? data.lon : 0,
            label:
              `${form.streetAddress}, ${form.ward ? form.ward + ", " : ""}${form.district ? form.district + ", " : ""}${form.city}`.trim(),
          });
          if (
            Array.isArray(data.route_geometry) &&
            data.route_geometry.length > 0
          ) {
            setRouteCoordinates(data.route_geometry);
          }
          if (
            typeof data.store_lat === "number" &&
            typeof data.store_lon === "number"
          ) {
            setStoreCoords({ lat: data.store_lat, lon: data.store_lon });
          }
        }
      } catch (err) {
        if (!cancelled) {
          setDistanceKm(null);
        }
      } finally {
        if (!cancelled) setIsCalculatingFee(false);
      }
    }, 600);

    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [form.streetAddress, form.district, form.ward, form.city]);

  // Auto-save form draft (debounced)
  const draftSaveTimerRef = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    if (!initializedRef.current) return;
    if (draftSaveTimerRef.current) clearTimeout(draftSaveTimerRef.current);
    draftSaveTimerRef.current = setTimeout(() => {
      const {
        fullName,
        apartment,
        phoneNumber,
        city,
        district,
        districtCode,
        ward,
        wardCode,
        streetAddress,
        notes,
      } = form;
      saveShippingDraft({
        fullName,
        apartment,
        phoneNumber,
        city,
        district,
        districtCode,
        ward,
        wardCode,
        streetAddress,
        notes,
      });
    }, 800);
    return () => {
      if (draftSaveTimerRef.current) clearTimeout(draftSaveTimerRef.current);
    };
  }, [form, saveShippingDraft]);

  return {
    ready,
    distanceKm,
    distanceFee,
    isCalculatingFee,
    isSubmitting,
    form,
    setForm,
    touched,
    setTouched,
    cityTouched,
    setCityTouched,
    delivery,
    setDelivery,
    pickupDate,
    setPickupDate,
    pickupTime,
    setPickupTime,
    minPickupDate,
    pickupSlots,
    isPickup,
    isDeliveryService,
    handleChange,
    handleBlur,
    handleCityChange,
    isInvalid,
    isPickupFieldInvalid,
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
    customerLocation,
    routeCoordinates,
    storeCoords,
    handleAddressSelect,
    hasPreOrder,
    preOrderEstimate,
  };
}
