"use client";

import AddressSuggest from "@/components/checkout/AddressSuggest";
import {
  CitySearchInput,
  DistrictSearchInput,
  WardSearchInput,
} from "@/components/ui/CityDistrictSelect";
import { House, Info, MapPinHouse, NotebookPen } from "lucide-react";
import clsx from "clsx";
import { memo, useEffect, useRef } from "react";
import ShippingDistanceMap from "./ShippingDistanceMap";

interface Props {
  city: string;
  district: string;
  ward: string;
  streetAddress: string;
  apartment?: string;
  notes: string;
  cityCode: string | null;
  cityTouched: boolean;
  streetTouched: boolean;
  isHCM: boolean;
  onCityChange: (city: string) => void;
  onDistrictChange: (district: string) => void;
  onWardChange: (ward: string) => void;
  onWardCodeChange: (code: string) => void;
  onAddressSelect: (address: string, lat?: number, lon?: number) => void;
  onChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => void;
  onBlur: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onCityTouched: () => void;
  customerLocation: { lat: number; lon: number; label: string } | null;
  storeCoords: { lat: number; lon: number } | null;
  routeCoordinates: [number, number][];
  distanceKm: number | null;
  isCalculatingFee: boolean;
  addressDistanceError?: boolean;
}

function AddressFields({
  city,
  district,
  ward,
  streetAddress,
  apartment = "",
  notes,
  cityCode,
  cityTouched,
  streetTouched,
  isHCM,
  onCityChange,
  onDistrictChange,
  onWardChange,
  onWardCodeChange,
  onAddressSelect,
  onChange,
  onBlur,
  onCityTouched,
  customerLocation,
  storeCoords,
  routeCoordinates,
  distanceKm,
  isCalculatingFee,
  addressDistanceError = false,
}: Props) {
  const streetInvalid =
    (streetTouched && !streetAddress.trim()) || addressDistanceError;

  const streetRef = useRef<HTMLTextAreaElement>(null);
  const notesRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (streetRef.current) {
      streetRef.current.style.height = "auto";
      streetRef.current.style.height = `${Math.min(streetRef.current.scrollHeight, 46)}px`;
    }
  }, [streetAddress]);

  useEffect(() => {
    if (notesRef.current) {
      notesRef.current.style.height = "auto";
      notesRef.current.style.height = `${Math.min(notesRef.current.scrollHeight, 46)}px`;
    }
  }, [notes]);

  return (
    <div className="relative clear-both space-y-4">
      {/* Address Selection: Row 1 (City full-width), Row 2 (District & Ward 2-col) */}
      <div className="space-y-3">
        <div>
          <label className="mb-1.5 ml-1 block text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
            Tỉnh / Thành phố <span className="ml-0.5 text-primary">*</span>
          </label>
          <CitySearchInput
            value={city}
            onChange={onCityChange}
            onBlur={onCityTouched}
            disabled={false}
            hasError={cityTouched && !city}
          />
          {cityTouched && !city && (
            <p className="ml-1 mt-1 text-[10px] font-bold text-error">
              Vui lòng chọn tỉnh / thành phố
            </p>
          )}
          {city && !isHCM && (
            <p className="ml-1 mt-1 text-xs font-bold text-on-surface-variant">
              ⚠️ Ngoài TP.HCM: Giao qua ĐVVC
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 ml-1 block text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
              Quận / Huyện <span className="ml-0.5 text-primary">*</span>
            </label>
            <DistrictSearchInput
              value={district}
              onChange={onDistrictChange}
              onBlur={() => {}}
              disabled={false}
              hasError={cityTouched && !district}
              cityCode={cityCode}
            />
            {cityTouched && !district && (
              <p className="ml-1 mt-1 text-[10px] font-bold text-error">
                Vui lòng chọn quận / huyện
              </p>
            )}
          </div>

          {isHCM && (
            <div>
              <label className="mb-1.5 ml-1 block text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                Phường / Xã <span className="ml-0.5 text-primary">*</span>
              </label>
              <WardSearchInput
                value={ward}
                onChange={onWardChange}
                onCodeChange={onWardCodeChange}
                onBlur={() => {}}
                disabled={false}
                hasError={cityTouched && !ward}
                cityName={city}
                districtName={district}
              />
              {cityTouched && !ward && (
                <p className="ml-1 mt-1 text-[10px] font-bold text-error">
                  Vui lòng chọn Phường / Xã
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Detailed Address */}
      <div
        id="address-street-field"
        className="relative z-30 focus-within:z-50"
      >
        <label className="mb-1.5 ml-1 block text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
          Địa chỉ cụ thể / Số nhà, tên đường{" "}
          <span className="ml-0.5 text-primary">*</span>
        </label>
        <div
          className={clsx(
            "relative flex items-start gap-2.5 rounded-xl border bg-surface-container/60 px-3.5 py-2.5 transition-all",
            streetInvalid
              ? "border-error bg-error/5"
              : "border-outline-variant/30 focus-within:border-primary focus-within:bg-surface"
          )}
        >
          <House
            className={clsx(
              "mt-0.5 h-4 w-4 flex-shrink-0 transition-colors",
              streetInvalid ? "text-error" : "text-outline-variant"
            )}
          />
          {isHCM ? (
            <AddressSuggest
              value={streetAddress}
              onChange={onAddressSelect}
              onBlur={() =>
                onBlur({
                  target: { name: "streetAddress" },
                } as React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>)
              }
              city={city}
              district={district}
              ward={ward}
              disabled={false}
            />
          ) : (
            <textarea
              ref={streetRef}
              name="streetAddress"
              value={streetAddress}
              onChange={onChange}
              onBlur={onBlur}
              placeholder="Số nhà, tên đường..."
              autoComplete="off"
              rows={1}
              className="max-h-16 min-h-[22px] min-w-0 flex-1 resize-none bg-transparent text-sm font-medium leading-relaxed text-on-surface outline-none placeholder:text-on-surface-variant/40"
            />
          )}
        </div>
        {streetInvalid && !streetAddress.trim() ? (
          <p className="ml-1 mt-1 text-[10px] font-bold text-error">
            Trường này là bắt buộc
          </p>
        ) : addressDistanceError ? (
          <p className="ml-1 mt-1 text-[10px] font-bold text-error">
            Không thể tính phí vận chuyển — vui lòng chọn lại địa chỉ chính xác
            hơn
          </p>
        ) : isHCM ? (
          <p className="ml-1 mt-1.5 flex items-start gap-1.5 text-[11px] leading-tight text-on-surface-variant/75">
            <Info size={13} className="mt-0.5 flex-shrink-0 text-primary" />
            <span>
              Nếu không tìm thấy địa chỉ chính xác, bạn có thể chọn địa điểm nổi
              bật gần đó và bổ sung số nhà ở mục{" "}
              <strong>Ghi chú giao hàng</strong>.
            </span>
          </p>
        ) : null}
      </div>

      {/* Apartment & Notes: 2 Rows full-width */}
      <div className="space-y-3">
        <div>
          <label className="mb-1.5 ml-1 block text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
            Căn hộ / Tầng (Tùy chọn)
          </label>
          <div className="flex items-center gap-2 rounded-xl border border-outline-variant/30 bg-surface-container/60 px-3.5 py-2.5 transition-all focus-within:border-primary focus-within:bg-surface">
            <MapPinHouse className="h-4 w-4 flex-shrink-0 text-outline-variant" />
            <input
              name="apartment"
              value={apartment}
              onChange={onChange}
              onBlur={onBlur}
              placeholder="Ví dụ: Tầng 4B, Chung cư..."
              type="text"
              autoComplete="off"
              className="min-w-0 flex-1 bg-transparent text-sm font-medium text-on-surface outline-none placeholder:text-on-surface-variant/40"
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 ml-1 block text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
            Ghi chú giao hàng (Tùy chọn)
          </label>
          <div className="flex items-start gap-2 rounded-xl border border-outline-variant/30 bg-surface-container/60 px-3.5 py-2.5 transition-all focus-within:border-primary focus-within:bg-surface">
            <NotebookPen className="mt-0.5 h-4 w-4 flex-shrink-0 text-outline-variant" />
            <textarea
              ref={notesRef}
              name="notes"
              value={notes}
              onChange={onChange}
              placeholder="Ví dụ: Gọi trước khi giao 15 phút..."
              rows={1}
              autoComplete="off"
              className="max-h-20 min-h-[22px] min-w-0 flex-1 resize-none bg-transparent text-sm font-medium leading-relaxed text-on-surface outline-none placeholder:text-on-surface-variant/40"
            />
          </div>
        </div>
      </div>

      {isHCM && (
        <ShippingDistanceMap
          customerLocation={customerLocation}
          storeCoords={storeCoords}
          routeCoordinates={routeCoordinates}
          distanceKm={distanceKm}
          isCalculatingFee={isCalculatingFee}
        />
      )}
    </div>
  );
}

export default memo(AddressFields);
