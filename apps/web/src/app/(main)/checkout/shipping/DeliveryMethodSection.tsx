"use client";

import { DELIVERY_OPTIONS, mappingDisplayPrice } from "@/constants";
import { formatVND } from "@/lib/currency";
import { ShippingMethod } from "@/lib/shipping-method";
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
      if (opt.id === ShippingMethod.Standard) {
        return {
          ...opt,
          sublabel: hasPreOrder
            ? `12-24 giờ xử lý · ${preOrderSuffix}`
            : "12-24 giờ xử lý",
          price: basicFee,
        };
      }
      if (opt.id === ShippingMethod.Express) {
        return {
          ...opt,
          sublabel: hasPreOrder
            ? `2-4 giờ xử lý · ${preOrderSuffix}`
            : "2-4 giờ xử lý",
          price: immediateFee,
        };
      }
      return opt;
    });
  }, [deliveryOptions, hasPreOrder, preOrderSuffix, basicFee, immediateFee]);

  return (
    <div className="space-y-2">
      <div className="ml-1 flex items-center justify-between gap-2 text-[10px] font-black tracking-widest text-on-surface-variant">
        <span className="uppercase">Phương thức giao hàng</span>
        {isCalculatingFee ? (
          <span
            className={`inline-flex items-center gap-1 text-xs font-bold text-on-surface-variant ${delivery === ShippingMethod.Pickup ? "sr-only" : ""}`}
          >
            <span className="loading loading-spinner loading-sm" />
            Đang tính phí...
          </span>
        ) : distanceKm !== null ? (
          <span
            className={`ml-2 text-sm font-bold text-on-surface-variant ${delivery === ShippingMethod.Pickup ? "sr-only" : ""}`}
          >
            {distanceKm.toFixed(1)} km
          </span>
        ) : null}
      </div>
      <div className="space-y-2">
        {isCalculatingFee ? (
          <div className="space-y-2">
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
          options
            .filter((opt) => !opt.isHidden)
            .map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setDelivery(opt.id)}
                className={clsx(
                  "relative flex w-full items-center gap-2 rounded-xl border-2 p-4 transition-all",
                  delivery === opt.id
                    ? "border-primary/80 bg-primary/5"
                    : "border-transparent bg-surface-container"
                )}
              >
                {delivery === opt.id && (
                  <div className="absolute -left-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary p-1">
                    <Check size={16} className="font-bold text-white" />
                  </div>
                )}
                <div
                  className={clsx(
                    "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl transition-all",
                    delivery === opt.id
                      ? "primary-gradient shadow-ambient-md"
                      : "bg-surface-container-highest"
                  )}
                >
                  <opt.icon
                    className={`h-5 w-5 ${
                      delivery === opt.id
                        ? "text-white"
                        : "text-on-surface-variant"
                    }`}
                  />
                </div>
                <div className="min-w-0 flex-1 text-left">
                  <span className="text-sm font-black text-on-surface">
                    {opt.label}
                  </span>
                  <span className="block text-xs text-on-surface-variant">
                    {opt.sublabel}
                  </span>
                </div>
                <div className="flex-shrink-0 text-right">
                  <span
                    className={clsx(
                      "text-sm font-black",
                      delivery === opt.id ? "text-primary" : "text-on-surface"
                    )}
                  >
                    {mappingDisplayPrice[
                      opt.price as keyof typeof mappingDisplayPrice
                    ] ?? formatVND(opt.price as number)}
                  </span>
                </div>
              </button>
            ))
        )}
      </div>
    </div>
  );
}

export default memo(DeliveryMethodSection);
