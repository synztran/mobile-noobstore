"use client";

import AddressSuggest from "@/components/checkout/AddressSuggest";
import {
  CitySearchInput,
  DistrictSearchInput,
  WardSearchInput,
} from "@/components/ui/CityDistrictSelect";
import { House } from "lucide-react";
import AutoResizeTextarea from "@/components/ui/AutoResizeTextarea";
import clsx from "clsx";
import { CheckCircle2, NotebookPen } from "lucide-react";
import { memo } from "react";
import ShippingDistanceMap from "./ShippingDistanceMap";

interface Props {
  city: string;
  district: string;
  ward: string;
  streetAddress: string;
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
  onBlur: (e: React.FocusEvent<HTMLInputElement>) => void;
  onCityTouched: () => void;
  customerLocation: { lat: number; lon: number; label: string } | null;
  storeCoords: { lat: number; lon: number } | null;
  routeCoordinates: [number, number][];
  distanceKm: number | null;
  isCalculatingFee: boolean;
}

function AddressFields({
  city,
  district,
  ward,
  streetAddress,
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
}: Props) {
  const streetInvalid = streetTouched && !streetAddress.trim();

  return (
    <div className="relative clear-both space-y-4">
      <div>
        <label className="mb-2 ml-1 block text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
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
            ⚠️ Khu vực ngoài TP.HCM — chỉ giao hàng bởi đơn vị vận chuyển
          </p>
        )}
      </div>

      <div>
        <label className="mb-2 ml-1 block text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
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
          <label className="mb-2 ml-1 mt-3 block text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
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

      <div>
        <label className="mb-2 ml-1 block text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
          Địa chỉ cụ thể <span className="ml-0.5 text-primary">*</span>
        </label>
        <div
          className={clsx(
            "relative flex items-center gap-3 rounded-2xl border-2 bg-surface-container px-4 py-3.5 transition-all",
            streetInvalid
              ? "border-error"
              : "border-transparent focus-within:border-primary"
          )}
        >
          <House
            className={clsx(
              "h-5 w-5 flex-shrink-0 transition-colors",
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
                } as React.FocusEvent<HTMLInputElement>)
              }
              city={city}
              district={district}
              ward={ward}
              disabled={false}
            />
          ) : (
            <input
              type="text"
              name="streetAddress"
              value={streetAddress}
              onChange={onChange}
              onBlur={onBlur}
              placeholder="Số nhà, tên đường..."
              autoComplete="off"
              className="min-w-0 flex-1 bg-transparent text-sm font-medium text-on-surface outline-none placeholder:text-on-surface-variant/40"
            />
          )}
          {streetAddress && !streetInvalid && (
            <CheckCircle2 size={16} className="flex-shrink-0 text-green-600" />
          )}
        </div>
        {streetInvalid && (
          <p className="ml-1 mt-1 text-[10px] font-bold text-error">
            Trường này là bắt buộc
          </p>
        )}
      </div>

      <div>
        <label className="mb-2 ml-1 block text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
          Ghi chú
        </label>
        <div className="flex items-start gap-3 rounded-2xl border-2 border-transparent bg-surface-container px-4 py-3.5 transition-all focus-within:border-primary">
          <NotebookPen className="flex-shrink-0 text-xl text-outline-variant" />
          <AutoResizeTextarea
            name="notes"
            value={notes}
            onChange={onChange}
            placeholder="Lưu ý về giờ giấc, địa điểm giao hàng,..."
            maxHeight={160}
            className="min-w-0 flex-1 bg-transparent text-sm font-medium text-on-surface outline-none placeholder:text-on-surface-variant/40"
          />
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
