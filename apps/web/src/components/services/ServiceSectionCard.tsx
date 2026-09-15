"use client";

import type { BookingService } from "@/app/api/services/booking-config/route";
import { formatVND } from "@/lib/currency";
import { Plus } from "lucide-react";
import Image from "@/components/ui/AdaptiveImage";
import { useMemo } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ServiceEntryCard } from "./ServiceEntryCard";
import { getSectionIcon } from "./sectionIcons";
import type { ServiceEntryDraft, ServiceSectionCardProps } from "./types";
import {
  buildPricingMaps,
  computeEntryPreviewPrice,
  type PricingMaps,
} from "./bookingHelpers";

// Re-exports for external consumers (useServiceBookingFlow, validators, handlers)
export {
  buildPricingMaps,
  CLEANING_KEYBOARD_LAYOUTS,
  CLEANING_KEYBOARD_PRICES,
  CLEANING_SWITCH_BUNDLES,
  CLEANING_SWITCH_STATUSES,
  computeCleaningPrice,
  computeKeycapStemPrice,
  computeSwitchLubePrice,
  getStabilizerTotal,
  setPricingMaps,
} from "./bookingHelpers";
export type { PricingMaps } from "./bookingHelpers";
export type { ServiceEntryDraft } from "./types";

export function ServiceSectionCard({
  section,
  selections,
  entryErrors,
  onAddEntry,
  onRemoveEntry,
  onSelectOptionValue,
  onChangeLineNote,
  onUpdateEntry,
  isQuickMode,
}: ServiceSectionCardProps) {
  const SectionIcon = getSectionIcon(section.key);

  return (
    <section
      id={section.key}
      className="card scroll-mt-24 overflow-hidden bg-surface-container shadow-sm"
    >
      {section.heroImageUrl ? (
        <figure className="relative h-44 w-full">
          <Image
            src={section.heroImageUrl}
            alt={`${section.title} hero`}
            fill
            sizes="100vw"
            className="object-cover"
          />
        </figure>
      ) : null}
      <div className="card-body space-y-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="w-full min-w-0">
            <div className="flex w-full items-center justify-between gap-4">
              <span className="flex items-center gap-2 font-black uppercase tracking-wide text-on-surface">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                  <SectionIcon className="h-4 w-4" />
                </span>
                {section.title}
              </span>
              <span className="badge badge-ghost badge-sm shrink-0 border-outline-variant/30 text-[10px] font-bold text-on-surface-variant">
                <strong className="text-primary">{section.services.length}</strong>
                dịch vụ
              </span>
            </div>
            {section.hint ? (
              <p className="mt-1 text-sm text-on-surface-variant">
                {section.hint}
              </p>
            ) : null}
          </div>
        </div>

        <div className="space-y-4">
          {section.services.map((service) => (
            <ServiceCard
              key={service.id}
              service={service}
              entries={selections[service.id] ?? []}
              entryErrors={entryErrors?.[service.id]}
              section={section}
              onAddEntry={onAddEntry}
              onRemoveEntry={onRemoveEntry}
              onUpdateEntry={onUpdateEntry}
              onSelectOptionValue={onSelectOptionValue}
              onChangeLineNote={onChangeLineNote}
              isQuickMode={isQuickMode}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── ServiceCard (per-service row) ────────────────────────────────────────────

function ServiceCard({
  service,
  entries,
  entryErrors,
  section,
  onAddEntry,
  onRemoveEntry,
  onUpdateEntry,
  onSelectOptionValue,
  onChangeLineNote,
  isQuickMode,
}: {
  service: BookingService;
  entries: ServiceEntryDraft[];
  entryErrors?: Record<string, string>;
  section: ServiceSectionCardProps["section"];
  onAddEntry: ServiceSectionCardProps["onAddEntry"];
  onRemoveEntry: ServiceSectionCardProps["onRemoveEntry"];
  onUpdateEntry: ServiceSectionCardProps["onUpdateEntry"];
  onSelectOptionValue: ServiceSectionCardProps["onSelectOptionValue"];
  onChangeLineNote: ServiceSectionCardProps["onChangeLineNote"];
  isQuickMode?: boolean;
}) {
  const subtotal = useMemo(
    () =>
      entries.reduce((sum, entry) => {
        const price = computeEntryPreviewPrice(entry, service);
        if (price !== null) return sum + price;
        return (
          sum +
          service.base_price *
            (service.service_section === "switch"
              ? (entry.switchCount ?? 1)
              : 1)
        );
      }, 0),
    [entries, service],
  );

  const hasError = entryErrors != null && Object.keys(entryErrors).length > 0;

  return (
    <div
      className={`card space-y-2 bg-surface-container-lowest p-3 ${
        hasError ? "border border-error/20 bg-error/5" : ""
      }`}
    >
      <div className="flex flex-col">
        <p className="text-sm font-black leading-tight text-on-surface">
          {service.name}
        </p>
        <p className="mt-1 text-xs text-on-surface-variant">
          {service.base_price > 0 ? `${formatVND(service.base_price)} · ` : ""}
          {service.handling_days} ngày xử lý
        </p>
        {service.description ? (
          <p className="mt-0.5 text-xs leading-relaxed text-on-surface-variant">
            {service.description}
          </p>
        ) : null}
      </div>

      {entries.length === 0 ? (
        <div className="flex items-center gap-2 rounded-xl border border-dashed border-outline-variant/30 bg-surface-container-low px-3 py-3">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-container-high">
            <Plus size={12} className="text-on-surface-variant" />
          </div>
          <p className="text-xs text-on-surface-variant">
            Nhấn <strong className="text-on-surface">Thêm dịch vụ</strong> để
            bắt đầu đặt lịch dịch vụ này.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <span className="badge badge-primary badge-sm gap-1.5 font-black">
            {entries.length}
            mục đã chọn
          </span>
          <AnimatePresence initial={false}>
            {entries.map((entry, idx) => (
              <motion.div
                key={entry.entryId}
                layout
                initial={{ opacity: 0, y: -8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ type: "spring", stiffness: 320, damping: 26 }}
              >
                <ServiceEntryCard
                  section={section}
                  service={service}
                  entry={entry}
                  index={idx}
                  error={entryErrors?.[entry.entryId]}
                  onRemoveEntry={onRemoveEntry}
                  onUpdateEntry={onUpdateEntry}
                  onSelectOptionValue={onSelectOptionValue}
                  onChangeLineNote={onChangeLineNote}
                  isQuickMode={isQuickMode}
                />
              </motion.div>
            ))}
          </AnimatePresence>
          <div className="flex items-center justify-between border-t border-outline-variant/20 pt-2 text-sm">
            <span className="font-black tracking-widest text-on-surface-variant">
              Tổng tiền
            </span>
            <span className="font-black text-primary">
              {formatVND(subtotal)}
            </span>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => onAddEntry(service)}
        disabled={
          service.max_entries !== null && entries.length >= service.max_entries
        }
        className="btn btn-outline btn-sm btn-block rounded-full text-[10px] font-black uppercase tracking-widest"
      >
        <Plus className="h-3.5 w-3.5" />
        {service.max_entries !== null && entries.length >= service.max_entries
          ? "Đã đạt giới hạn"
          : "Thêm mới dịch vụ"}
      </button>
    </div>
  );
}
