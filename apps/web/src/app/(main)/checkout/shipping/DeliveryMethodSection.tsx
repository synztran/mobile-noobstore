"use client";

import { DELIVERY_OPTIONS, mappingDisplayPrice } from "@/constants";
import { formatVND } from "@/lib/currency";
import { ShippingMethod } from "@/lib/shipping-method";
import { getCarrierShippingTier } from "@/lib/carrier-shipping";
import { Check } from "lucide-react";
import clsx from "clsx";
import { memo, useMemo } from "react";

interface DeliveryOption {
  id: string;
  label: string;
  sublabel: string;
  icon: string | React.ComponentType<{ className?: string }>;
  price: number | null;
  tag?: string | null;
  providerType?: "noobstore" | "carrier";
  providerLabel?: string;
  isHidden: boolean;
}

interface Props {
  hasPreOrder: boolean;
  preOrderEstimate: string | null;
  delivery: string;
  setDelivery: (id: string) => void;
  deliveryOptions: DeliveryOption[];
  isCalculatingFee: boolean;
  distanceKm: number | null;
  immediateFee: number;
  basicFee: number;
}

function DeliveryMethodSection({
  hasPreOrder,
  preOrderEstimate,
  delivery,
  setDelivery,
  deliveryOptions,
  isCalculatingFee,
  distanceKm,
  immediateFee,
  basicFee,
}: Props) {
  const preOrderSuffix = `Sau khi có hàng`;

  const options = useMemo(() => {
    return deliveryOptions.map((opt) => {
      const distanceSuffix =
        distanceKm !== null ? ` · Khoảng cách ${distanceKm.toFixed(1)} km` : "";

      if (opt.id === ShippingMethod.Standard) {
        return {
          ...opt,
          label: "Giao hàng Tiêu chuẩn",
          providerType: "noobstore" as const,
          providerLabel: "NoobStore trực tiếp xử lý",
          sublabel: hasPreOrder
            ? `12-24 giờ xử lý · ${preOrderSuffix}${distanceSuffix}`
            : `Rider NoobStore giao tận nơi trong 12-24 giờ${distanceSuffix}`,
          price: basicFee,
        };
      }
      if (opt.id === ShippingMethod.Express) {
        return {
          ...opt,
          label: "Giao hàng Hỏa tốc",
          providerType: "noobstore" as const,
          providerLabel: "NoobStore trực tiếp xử lý",
          sublabel: hasPreOrder
            ? `2-4 giờ xử lý · ${preOrderSuffix}${distanceSuffix}`
            : `Rider NoobStore giao nhanh trong 2-4 giờ${distanceSuffix}`,
          price: immediateFee,
        };
      }
      if (opt.id === ShippingMethod.Carrier4h) {
        return {
          ...opt,
          label: "Giao Hỏa tốc 4H",
          providerType: "carrier" as const,
          providerLabel: "ĐVVC đối tác",
          sublabel: `Tài xế Ahamove / Grab giao ngay trong 4 giờ${distanceSuffix}`,
        };
      }
      if (getCarrierShippingTier(opt.id) || opt.id === ShippingMethod.Shipment || opt.id === ShippingMethod.DeliveryService) {
        return {
          ...opt,
          label: opt.label.includes("Giao") ? opt.label : `Giao hàng ${opt.label}`,
          providerType: "carrier" as const,
          providerLabel: "ĐVVC đối tác",
          sublabel: hasPreOrder
            ? `${opt.sublabel} · ${preOrderSuffix}`
            : (opt.sublabel ?? "Giao qua bưu cục toàn quốc"),
        };
      }
      return opt;
    });
  }, [deliveryOptions, hasPreOrder, preOrderSuffix, basicFee, immediateFee, distanceKm]);

  return (
    <div className="space-y-3">
      {isCalculatingFee ? (
        <div className="space-y-2.5">
          {[1, 2].map((idx) => (
            <div
              key={idx}
              className="flex w-full animate-pulse items-center justify-between gap-3.5 rounded-xl border border-outline-variant/20 bg-surface-container/50 p-3.5"
            >
              <div className="flex items-center gap-3">
                <div className="h-4 w-4 rounded-full bg-surface-container-high" />
                <div className="space-y-1.5 py-1">
                  <div className="h-3.5 w-44 rounded-full bg-surface-container-high" />
                  <div className="h-2.5 w-60 rounded-full bg-surface-container-high" />
                </div>
              </div>
              <div className="h-5 w-20 rounded-full bg-surface-container-high" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2.5">
          {options
            .filter((opt) => !opt.isHidden && opt.id !== ShippingMethod.Pickup)
            .map((opt) => {
              const isSelected = delivery === opt.id;

              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setDelivery(opt.id)}
                  className={clsx(
                    "flex w-full items-center justify-between gap-3 rounded-xl p-3.5 text-left transition-all",
                    isSelected
                      ? "border-2 border-primary bg-primary/[0.04] shadow-sm"
                      : "border border-outline-variant/30 bg-surface hover:border-outline-variant/60"
                  )}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    {/* Radio Indicator */}
                    <div
                      className={clsx(
                        "grid h-4 w-4 flex-shrink-0 place-items-center rounded-full border-2 transition-all",
                        isSelected
                          ? "border-primary bg-primary text-surface"
                          : "border-outline-variant/60 bg-transparent"
                      )}
                    >
                      {isSelected && (
                        <div className="h-1.5 w-1.5 rounded-full bg-surface" />
                      )}
                    </div>

                    {/* Labels */}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-on-surface sm:text-sm">
                          {opt.label}
                        </span>
                        {opt.providerLabel && (
                          <span
                            className={clsx(
                              "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                              opt.providerType === "noobstore"
                                ? "border border-[#cce8d7] bg-[#f0f9f4] text-[#1e5e2e]"
                                : "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                            )}
                          >
                            <span
                              className={clsx(
                                "h-1.5 w-1.5 rounded-full",
                                opt.providerType === "noobstore"
                                  ? "bg-emerald-600 dark:bg-emerald-400"
                                  : "bg-amber-500"
                              )}
                            />
                            {opt.providerLabel}
                          </span>
                        )}
                        {opt.tag && (
                          <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold uppercase text-primary">
                            {opt.tag}
                          </span>
                        )}
                      </div>
                      <span className="mt-0.5 block truncate text-[11px] text-on-surface-variant">
                        {opt.sublabel}
                      </span>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="flex-shrink-0 text-right">
                    <span
                      className={clsx(
                        "text-xs font-extrabold sm:text-sm",
                        isSelected ? "text-primary" : "text-on-surface"
                      )}
                    >
                      {mappingDisplayPrice[
                        opt.price as keyof typeof mappingDisplayPrice
                      ] ?? formatVND(opt.price as number)}
                    </span>
                  </div>
                </button>
              );
            })}
        </div>
      )}
    </div>
  );
}

export default memo(DeliveryMethodSection);
