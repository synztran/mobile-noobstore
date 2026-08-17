"use client";

import {
  countAvailableMethods,
  getDeliveryAvailability,
  type DeliveryMethodAvailability,
} from "@/lib/delivery-availability";
import type { ShopVariant } from "@/app/api/products/route";
import { DELIVERY_OPTIONS } from "@/constants";
import { Check, ChevronDown, X } from "lucide-react";
import clsx from "clsx";
import { useEffect, useMemo, useState } from "react";

interface DeliveryAvailabilitySectionProps {
  /** Passing the product's variants lets the section detect pre-orders itself. */
  variants?: ShopVariant[];
  /**
   * The currently selected variant(s). Simple products contribute one variant;
   * kit products contribute every selected component variant. Pre-order state
   * follows the selection: any pre-order variant → its estimate; otherwise
   * working-hour ETAs. Empty/undefined → falls back to `variants`.
   */
  selectedVariants?: ShopVariant[];
}

interface MethodRow extends DeliveryMethodAvailability {
  icon: React.ComponentType<{ className?: string }>;
}

const ICON_BY_ID = Object.fromEntries(
  DELIVERY_OPTIONS.map((opt) => [
    opt.id,
    opt.icon as React.ComponentType<{ className?: string }>,
  ])
);

export function DeliveryAvailabilitySection({
  variants,
  selectedVariants,
}: DeliveryAvailabilitySectionProps) {
  const [now, setNow] = useState<Date | null>(null);
  const [expanded, setExpanded] = useState(false);

  // The selection decides pre-order: if any selected variant (simple variant
  // or kit component) is pre-order, use its estimate; otherwise show working-
  // hour ETAs. Without a selection, fall back to any pre-order variant among
  // the product's variants.
  const { isPreOrder, preOrderEstimate } = useMemo(() => {
    const preOrder = selectedVariants?.find((v) => v.is_pre_order);
    if (preOrder) {
      return {
        isPreOrder: true,
        preOrderEstimate: preOrder.pre_order_config?.estimate ?? null,
      };
    }
    if (selectedVariants && selectedVariants.length > 0) {
      return { isPreOrder: false, preOrderEstimate: null };
    }
    const isPreOrder = variants?.some((v) => v.is_pre_order) ?? false;
    const preOrderEstimate =
      variants?.find((v) => v.pre_order_config?.estimate)?.pre_order_config
        ?.estimate ?? null;
    return { isPreOrder, preOrderEstimate };
  }, [variants, selectedVariants]);

  // Only read the clock after mount to avoid SSR/client mismatch, and refresh
  // every minute so the ETA stays accurate while the page is open.
  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const methods: MethodRow[] = useMemo(() => {
    if (!now) return [];
    return getDeliveryAvailability(now, { isPreOrder, preOrderEstimate }).map(
      (m) => ({ ...m, icon: ICON_BY_ID[m.id] })
    );
  }, [now, isPreOrder, preOrderEstimate]);

  const availableCount = countAvailableMethods(methods);

  const hasUnselectedVariants =
    (variants?.length ?? 0) > 0 && (selectedVariants?.length ?? 0) === 0;

  if (!now && !hasUnselectedVariants) return null;

  return (
    <div className="w-full rounded-xl bg-[#f8f8f8] p-2">
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => !hasUnselectedVariants && setExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <div className="inline-flex w-full flex-wrap items-center justify-between">
          <div className="space-x-1">
            <span className="text-sm font-bold uppercase text-primary">
              Vận chuyển
            </span>
          </div>

          <div className="flex items-center">
            <span className="text-xs tracking-widest text-on-surface-variant">
              {hasUnselectedVariants
                ? `Vui lòng chọn cấu hình`
                : `${availableCount}/${methods.length} khả dụng`}
            </span>
            {!hasUnselectedVariants ? (
              <span className="inline-flex flex-shrink-0 items-center gap-1">
                <ChevronDown
                  size={16}
                  className={clsx(
                    "text-on-surface-variant transition-transform duration-200",
                    expanded && "rotate-180"
                  )}
                />
              </span>
            ) : null}
          </div>
        </div>
      </button>

      {expanded && (
        <div className="mt-2 space-y-1">
          {methods.map((m) => (
            <div
              key={m.id}
              className={clsx(
                "flex items-center gap-2 rounded-lg px-2 py-2",
                m.available ? "" : "opacity-45"
              )}
            >
              <span
                className={clsx(
                  "flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg",
                  m.available
                    ? "bg-primary/10 text-primary"
                    : "bg-surface-container text-on-surface-variant"
                )}
              >
                <m.icon className="text-sm" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-black text-on-surface">
                  {m.label}
                </p>
                <p className="text-[10px] font-bold text-on-surface-variant/70">
                  {m.available
                    ? `Dự kiến nhận hàng: ${m.eta}`
                    : `Sẽ khả dụng: ${m.eta}`}
                </p>
              </div>
              <span
                className={clsx(
                  "flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full",
                  m.available ? "bg-emerald-500" : "bg-outline-variant/40"
                )}
              >
                {m.available ? (
                  <Check size={11} className="text-white" strokeWidth={3} />
                ) : (
                  <X
                    size={11}
                    className="text-on-surface-variant/60"
                    strokeWidth={3}
                  />
                )}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
