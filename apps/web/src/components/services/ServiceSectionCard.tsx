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

/**
 * One service group.
 *
 * The group, its services and each selected entry used to be three stacked
 * cards — a card inside a card inside a card. Structure now comes from the
 * paper tonal stack instead: one tonal surface per group, services separated by
 * hairlines, and selected entries inset on the lightest step. Elevation is
 * declared once (the group's own surface), never a border under a shadow.
 */
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
      className="scroll-mt-24 overflow-hidden rounded-2xl bg-surface-container"
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
      <div className="space-y-4 p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex min-w-0 items-center gap-2.5 text-xl font-extrabold tracking-[-0.01em] text-on-surface">
            {/* Olive marks identity; terracotta is kept for action only. */}
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-secondary-container text-on-secondary-fixed-variant">
              <SectionIcon className="h-4 w-4" />
            </span>
            <span className="truncate">{section.title}</span>
          </h2>
          <span className="shrink-0 rounded-full bg-surface-container-high px-2.5 py-1 text-xs font-bold text-on-surface-variant">
            <strong className="text-on-surface">
              {section.services.length}
            </strong>{" "}
            dịch vụ
          </span>
        </div>

        {section.hint ? (
          <p className="text-sm leading-relaxed text-on-surface-variant">
            {section.hint}
          </p>
        ) : null}

        <div className="divide-y divide-outline-variant/25">
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
    // Constant geometry in both states — only the tone changes on error.
    <div
      className={`space-y-3 rounded-xl px-3 py-4 ${
        hasError ? "bg-error/5" : ""
      }`}
    >
      <div className="flex flex-col">
        <p className="text-sm font-extrabold leading-tight text-on-surface">
          {service.name}
        </p>
        <p className="mt-1 text-sm text-on-surface-variant">
          {service.base_price > 0 ? `${formatVND(service.base_price)} · ` : ""}
          {service.handling_days} ngày xử lý
        </p>
        {service.description ? (
          <p className="mt-1 text-sm leading-relaxed text-on-surface-variant">
            {service.description}
          </p>
        ) : null}
      </div>

      {entries.length === 0 ? (
        <div className="flex items-center gap-2.5 rounded-xl border border-dashed border-outline-variant/40 bg-surface-container-low px-3 py-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-container-high">
            <Plus size={12} className="text-on-surface-variant" />
          </span>
          <p className="text-sm text-on-surface-variant">
            Nhấn <strong className="text-on-surface">Thêm dịch vụ</strong> để
            bắt đầu đặt lịch dịch vụ này.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-2.5 py-1 text-xs font-bold text-primary-content">
            {entries.length} mục đã chọn
          </span>

          {/* Selected entries: inset on the lightest paper step. */}
          <div className="rounded-xl bg-surface-container-lowest px-3 py-1">
            <div className="divide-y divide-outline-variant/20">
              <AnimatePresence initial={false}>
                {entries.map((entry, idx) => (
                  <motion.div
                    key={entry.entryId}
                    layout
                    initial={{ opacity: 0, y: -8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 320, damping: 26 }}
                    className="py-3 first:pt-3 last:pb-3"
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
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-outline-variant/25 pt-2 text-sm">
            <span className="font-bold tracking-[0.08em] text-on-surface-variant uppercase">
              Tổng tiền
            </span>
            <span className="font-extrabold text-primary">
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
        className="btn btn-outline btn-sm btn-block rounded-full text-xs font-bold tracking-[0.08em] uppercase"
      >
        <Plus className="h-3.5 w-3.5" />
        {service.max_entries !== null && entries.length >= service.max_entries
          ? "Đã đạt giới hạn"
          : "Thêm mới dịch vụ"}
      </button>
    </div>
  );
}
