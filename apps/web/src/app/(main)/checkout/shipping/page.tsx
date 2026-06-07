"use client";

import {
  CitySearchInput,
  DistrictSearchInput,
  WardSearchInput,
} from "@/components/ui/CityDistrictSelect";
import Icon from "@/components/ui/Icon";
import { DELIVERY_OPTIONS, mappingDisplayPrice } from "@/constants";
import { DISTRICT_MAP, VIETNAM_CITIES } from "@/constants/vietnam-cities";
import { useShippingForm } from "@/hooks/useShippingForm";
import { formatVND } from "@/lib/currency";
import clsx from "clsx";
import { Mailbox, MapPinHouse, Phone, Truck } from "lucide-react";
import { useMemo } from "react";

const FIELDS = [
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
    name: "streetAddress",
    label: "Địa chỉ",
    placeholder: "123 Đường Nguyễn Huệ, Quận 1",
    icon: "home",
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
    colSpan: 2,
  },
  {
    name: "postalCode",
    label: "Mã bưu điện",
    placeholder: "70000",
    icon: <Mailbox size={20} />,
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
] as const;

type FieldName = (typeof FIELDS)[number]["name"];

export default function ShippingPage() {
  const {
    form,
    setForm,
    distanceKm,
    distanceFee,
    isCalculatingFee,
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
    orderTotal,
    immediateFee,
    basicFee,
  } = useShippingForm();

  const cityCode = useMemo(
    () => VIETNAM_CITIES.find((c) => c.name === form.city)?.code ?? null,
    [form.city]
  );
  const handleDistrictChange = (district: string) => {
    const districtCode = cityCode
      ? ((DISTRICT_MAP[cityCode] ?? []).find((d) => d.name === district)
          ?.code ?? "")
      : "";
    setForm((prev) => ({
      ...prev,
      district,
      districtCode,
      ward: "",
      wardCode: "",
    }));
  };

  const mappingFees: Record<"express" | "standard", number> = {
    express: immediateFee,
    standard: basicFee,
  };

  const deliveryOptions = useMemo(() => {
    return DELIVERY_OPTIONS.map((opt) => {
      const fee =
        opt.id === "express" || opt.id === "standard"
          ? mappingFees[opt.id]
          : opt.price;
      return {
        ...opt,
        price: fee,
        isHidden: isHCM ? opt.isHidden : !opt.isHidden, // shipment option only available for non-HCM cities
      };
    });
  }, [immediateFee, basicFee, isHCM]);

  console.log("deliveryOptions", deliveryOptions);

  return (
    <div className="space-y-8">
      {/* ── Hero header ─────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/10 via-surface-container to-surface-container-low p-6">
        <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-6 -left-6 h-24 w-24 rounded-full bg-secondary/10 blur-xl" />
        <div className="relative flex items-center gap-4">
          <div className="primary-gradient flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl shadow-ambient-sm">
            <Truck className="text-2xl text-white" />
          </div>
          <div>
            <p className="mb-0.5 text-[10px] font-black uppercase tracking-[0.2em] text-primary">
              Bước 01 / 03
            </p>
            <h2 className="text-2xl font-black tracking-tight text-on-surface">
              Thông tin giao hàng
            </h2>
            <p className="mt-0.5 text-xs text-on-surface-variant">
              Nhập địa chỉ nhận hàng của bạn
            </p>
          </div>
        </div>
        {/* Progress bar */}
        <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-surface-container-high">
          <div className="primary-gradient h-full w-1/3 rounded-full" />
        </div>
      </div>

      {/* ── Address form ─────────────────────────────────────────── */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          {FIELDS.map((field) => (
            <div
              key={field.name}
              className={field.colSpan === 2 ? "col-span-2" : "col-span-1"}
            >
              <label className="mb-2 ml-1 block text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                {field.label}
                {field.required && (
                  <span className="ml-0.5 text-primary">*</span>
                )}
              </label>
              <div
                className={clsx(
                  "flex items-center gap-3 rounded-2xl border-2 bg-surface-container px-4 py-3.5 transition-all",
                  isInvalid(field.name, field.required)
                    ? "border-error"
                    : "border-transparent focus-within:border-primary"
                )}
              >
                {typeof field.icon === "string" ? (
                  <Icon
                    name={String(field.icon)}
                    className={clsx(
                      "flex-shrink-0 text-xl transition-colors",
                      isInvalid(field.name, field.required)
                        ? "text-error"
                        : "text-outline-variant"
                    )}
                  />
                ) : (
                  <div
                    className={clsx(
                      "flex-shrink-0 text-xl transition-colors",
                      isInvalid(field.name, field.required)
                        ? "text-error"
                        : "text-outline-variant"
                    )}
                  >
                    {field.icon}
                  </div>
                )}
                <input
                  name={field.name}
                  value={form[field.name]}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder={field.placeholder}
                  type={field.type}
                  autoComplete="off"
                  className="min-w-0 flex-1 bg-transparent text-sm font-medium text-on-surface outline-none placeholder:text-on-surface-variant/40"
                />
                {form[field.name] && !isInvalid(field.name, field.required) && (
                  <Icon
                    name="check_circle"
                    className="flex-shrink-0 text-base text-primary"
                  />
                )}
              </div>
              {isInvalid(field.name, field.required) && (
                <p className="ml-1 mt-1 text-[10px] font-bold text-error">
                  Trường này là bắt buộc
                </p>
              )}
            </div>
          ))}
        </div>

        {/* ── City select ─────────────────────────────────────── */}
        <div>
          <label className="mb-2 ml-1 block text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
            Tỉnh / Thành phố
            <span className="ml-0.5 text-primary">*</span>
          </label>
          <CitySearchInput
            value={form.city}
            onChange={handleCityChange}
            onBlur={() => setCityTouched(true)}
            disabled={false}
            hasError={cityTouched && !form.city}
          />
          {cityTouched && !form.city && (
            <p className="ml-1 mt-1 text-[10px] font-bold text-error">
              Vui lòng chọn tỉnh / thành phố
            </p>
          )}
          {form.city && form.city !== "Thành phố Hồ Chí Minh" && (
            <p className="ml-1 mt-1 text-xs font-bold text-on-surface-variant">
              ⚠️ Khu vực ngoài TP.HCM — chỉ giao hàng bởi đơn vị vận chuyển
            </p>
          )}
        </div>

        {/* ── District / Ward ─────────────────────────────────── */}
        <div>
          {/* District selector (quận / huyện) */}
          <label className="mb-2 ml-1 block text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
            Quận / Huyện
            <span className="ml-0.5 text-primary">*</span>
          </label>
          <DistrictSearchInput
            value={form.district}
            onChange={handleDistrictChange}
            onBlur={() => {}}
            disabled={false}
            hasError={cityTouched && !form.district}
            cityCode={cityCode}
          />
          {cityTouched && !form.district && (
            <p className="ml-1 mt-1 text-[10px] font-bold text-error">
              Vui lòng chọn quận / huyện
            </p>
          )}

          {/* Ward input (phường / xã) */}
          <label className="mb-2 ml-1 mt-3 block text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
            Phường / Xã
            <span className="ml-0.5 text-primary">*</span>
          </label>
          <WardSearchInput
            value={form.ward}
            onChange={(ward: string) => setForm((prev) => ({ ...prev, ward }))}
            onCodeChange={(code: string) =>
              setForm((prev) => ({ ...prev, wardCode: code }))
            }
            onBlur={() => {}}
            disabled={false}
            hasError={cityTouched && !form.ward}
            cityName={form.city}
            districtName={form.district}
          />
          {cityTouched && !form.ward && (
            <p className="ml-1 mt-1 text-[10px] font-bold text-error">
              Vui lòng chọn Phường / Xã
            </p>
          )}
        </div>

        {/* ── Delivery speed ───────────────────────────────────── */}
        <div className="space-y-3">
          <div className="ml-1 flex items-center justify-between gap-2 text-[10px] font-black tracking-widest text-on-surface-variant">
            <span className="uppercase">Phương thức giao hàng</span>
            {isCalculatingFee ? (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-on-surface-variant">
                <span className="loading loading-spinner loading-sm" />
                Đang tính phí...
              </span>
            ) : distanceKm !== null ? (
              <span className="ml-2 text-sm font-bold text-on-surface-variant">
                {distanceKm.toFixed(1)} km
              </span>
            ) : null}
          </div>
          <div className="space-y-3">
            {isCalculatingFee ? (
              <div className="space-y-3">
                {[1, 2].map((idx) => (
                  <div
                    key={idx}
                    className="flex w-full animate-pulse items-center gap-4 rounded-2xl border-2 border-transparent bg-surface-container p-4"
                  >
                    <div className="h-11 w-11 rounded-xl bg-surface-container-high" />
                    <div className="min-w-0 flex-1 space-y-2 py-1">
                      <div className="h-4 w-2/5 rounded-full bg-surface-container-high" />
                      <div className="h-3 w-1/2 rounded-full bg-surface-container-high" />
                    </div>
                    <div className="h-5 w-16 rounded-full bg-surface-container-high" />
                    <div className="h-5 w-5 rounded-full border-2 border-outline-variant bg-surface-container-high" />
                  </div>
                ))}
              </div>
            ) : (
              deliveryOptions.map((opt) => {
                return (
                  <button
                    key={opt.id}
                    type="button"
                    disabled={opt.isHidden}
                    onClick={() => !opt.isHidden && setDelivery(opt.id)}
                    className={clsx(
                      "flex w-full items-center gap-4 rounded-2xl border-2 p-4 transition-all",
                      opt.isHidden && "hidden"
                    )}
                  >
                    <div
                      className={clsx(
                        "flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl transition-all",
                        delivery === opt.id
                          ? "primary-gradient shadow-ambient-sm"
                          : "bg-surface-container-high"
                      )}
                    >
                      {typeof opt.icon === "string" ? (
                        <Icon
                          name={opt.icon}
                          className={clsx(
                            delivery === opt.id
                              ? "text-white"
                              : "text-on-surface-variant",
                            "text-xl"
                          )}
                        />
                      ) : (
                        <opt.icon
                          className={`text-xl ${delivery === opt.id ? "text-white" : "text-on-surface-variant"}`}
                        />
                      )}
                    </div>
                    <div className="min-w-0 flex-1 text-left">
                      <div className="flex items-center gap-2">
                        <span className="text-base font-black text-on-surface">
                          {opt.label}
                        </span>
                        {opt.tag && (
                          <span className="rounded bg-primary px-1.5 py-0.5 text-[9px] font-black tracking-wider text-on-primary">
                            {opt.tag}
                          </span>
                        )}
                      </div>
                      <span className="text-sm text-on-surface-variant">
                        {opt.sublabel}
                      </span>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <span
                        className={clsx(
                          "text-sm font-black",
                          delivery === opt.id
                            ? "text-primary"
                            : "text-on-surface"
                        )}
                      >
                        {mappingDisplayPrice[
                          opt.price as keyof typeof mappingDisplayPrice
                        ] ?? formatVND(opt.price as number)}
                      </span>
                    </div>
                    <div
                      className={clsx(
                        "flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 transition-all",
                        delivery === opt.id
                          ? "border-primary bg-primary"
                          : "border-outline-variant"
                      )}
                    >
                      {delivery === opt.id && (
                        <div className="h-2 w-2 rounded-full bg-on-primary" />
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
        {/* ── Order summary + CTA ──────────────────────────────── */}
        <div className="overflow-hidden rounded-3xl bg-surface-container-low">
          <div className="space-y-3 px-5 pb-4 pt-5">
            <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
              Tóm tắt đơn hàng
            </p>
            <div className="flex items-center justify-between text-sm">
              <span className="text-on-surface-variant">Tạm tính</span>
              <span className="font-bold text-on-surface">
                {formatVND(subtotal)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-on-surface-variant">Phí vận chuyển</span>
              <span
                className={clsx(
                  "font-bold",
                  shippingCost === 0 ? "text-secondary" : "text-on-surface"
                )}
              >
                {shippingCost === 0 ? "Miễn phí" : formatVND(shippingCost)}
              </span>
            </div>
            <div className="h-px bg-outline-variant/30" />
            <div className="flex items-center justify-between">
              <span className="font-black text-on-surface">Tổng cộng</span>
              <span className="text-2xl font-black text-on-surface">
                {formatVND(orderTotal)}
              </span>
            </div>
          </div>
          <button
            type="submit"
            disabled={isCalculatingFee}
            className={clsx(
              "primary-gradient flex w-full items-center justify-center gap-2 !rounded-b-3xl py-5 text-sm font-black uppercase tracking-widest text-white transition-opacity active:opacity-90",
              isCalculatingFee && "cursor-not-allowed opacity-70"
            )}
          >
            {isCalculatingFee ? (
              <>
                <span className="loading loading-spinner loading-sm" />
                Đang tính toán...
              </>
            ) : (
              <>
                Tiếp tục thanh toán
                <Icon name="arrow_forward" className="text-lg" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
