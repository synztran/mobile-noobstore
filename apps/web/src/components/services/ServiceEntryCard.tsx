"use client";

import type {
  BookingSection,
  BookingService,
} from "@/app/api/services/booking-config/route";
import { formatVND } from "@/lib/currency";
import clsx from "clsx";
import { computeEntryPreviewPrice } from "./bookingHelpers";
import { CleaningEntryConfig } from "./CleaningEntryConfig";
import { KeycapStemEntryConfig } from "./KeycapStemEntryConfig";
import { QuantityStepper } from "./QuantityStepper";
import { RepairEntryConfig } from "./RepairEntryConfig";
import { StabilizerEntryConfig } from "./StabilizerEntryConfig";
import { SwitchLubeEntryConfig } from "./SwitchLubeEntryConfig";
import type { ServiceEntryDraft, ServiceSectionCardProps } from "./types";
import { Trash } from "lucide-react";

// ─── ServiceEntryHeader ───────────────────────────────────────────────────────

function ServiceEntryHeader({
  index,
  onRemove,
}: {
  index: number;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <p className="text-xs font-black uppercase tracking-wider text-on-surface">
        Dịch vụ {index + 1}
      </p>
      <button
        type="button"
        onClick={onRemove}
        className="flex h-full items-center justify-center rounded-md bg-error/10 p-1 font-bold text-error transition-colors hover:bg-error/20"
      >
        <Trash size={16} />
      </button>
    </div>
  );
}

// ─── ServiceEntryOptions ──────────────────────────────────────────────────────

function ServiceEntryOptions({
  service,
  entry,
  onSelectOptionValue,
}: {
  service: BookingService;
  entry: ServiceEntryDraft;
  onSelectOptionValue: ServiceSectionCardProps["onSelectOptionValue"];
}) {
  const options = service.options.filter((opt) => {
    if (service.id === "svc-switch-lube" && opt.label === "Loại grease")
      return false;
    if (
      service.service_section === "stabilizer" &&
      (opt.label === "Stabilizer Brand" || opt.label === "Lube Type")
    )
      return false;
    return true;
  });

  if (options.length === 0) return null;

  return (
    <>
      {options.map((option) => {
        const selectedValueId =
          entry.selectedByOptionId[String(option.id)] ?? null;
        return (
          <div key={option.id} className="space-y-1.5">
            <p className="text-[11px] font-bold text-on-surface-variant">
              {option.label}
              {option.is_required ? " *" : ""}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {option.values.map((value) => {
                const selected = selectedValueId === value.id;
                return (
                  <button
                    key={value.id}
                    type="button"
                    onClick={() =>
                      onSelectOptionValue(
                        service,
                        entry.entryId,
                        option.id,
                        value.id,
                        option.is_required
                      )
                    }
                    className={clsx(
                      "rounded-xl border px-2.5 py-1.5 text-[11px] font-semibold transition-colors",
                      selected
                        ? "border-primary bg-primary text-on-primary"
                        : "border-outline-variant/30 bg-surface-container text-on-surface"
                    )}
                  >
                    {value.label}
                    {value.price_adjustment !== 0 ? (
                      <span className="ml-1 opacity-80">
                        {value.price_adjustment > 0 ? "+" : ""}
                        {formatVND(value.price_adjustment)}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </>
  );
}

// ─── ServiceEntryCard ─────────────────────────────────────────────────────────

interface ServiceEntryCardProps {
  section: BookingSection;
  service: BookingService;
  entry: ServiceEntryDraft;
  index: number;
  error?: string;
  onRemoveEntry: ServiceSectionCardProps["onRemoveEntry"];
  onUpdateEntry: ServiceSectionCardProps["onUpdateEntry"];
  onSelectOptionValue: ServiceSectionCardProps["onSelectOptionValue"];
  onChangeLineNote: ServiceSectionCardProps["onChangeLineNote"];
}

export function ServiceEntryCard({
  section,
  service,
  entry,
  index,
  error,
  onRemoveEntry,
  onUpdateEntry,
  onSelectOptionValue,
  onChangeLineNote,
}: ServiceEntryCardProps) {
  const previewPrice = computeEntryPreviewPrice(entry, service);

  return (
    <div className="space-y-2 rounded-xl border border-primary/20 bg-primary/5 p-2">
      <ServiceEntryHeader
        index={index}
        onRemove={() => onRemoveEntry(service.id, entry.entryId)}
      />

      {section.key === "repair" ? (
        <RepairEntryConfig
          entry={entry}
          serviceId={service.id}
          onUpdateEntry={onUpdateEntry}
        />
      ) : null}

      {section.key === "stabilizer" ? (
        <StabilizerEntryConfig
          entry={entry}
          serviceId={service.id}
          lubeOption={service.options.find((o) => o.label === "Lube Type")}
          onUpdateEntry={onUpdateEntry}
        />
      ) : null}

      {section.key === "lubricant" ? (
        <div className="space-y-1.5">
          <p className="text-[11px] font-bold text-on-surface-variant">
            Số lượng switch <span className="text-error">*</span>
          </p>
          <QuantityStepper
            value={entry.switchCount}
            onChange={(v) =>
              onUpdateEntry(service.id, entry.entryId, {
                switchCount: v,
              })
            }
            unit="switch"
            maxW
          />
        </div>
      ) : null}

      {section.key === "cleaning" ? (
        <CleaningEntryConfig
          entry={entry}
          serviceId={service.id}
          onUpdateEntry={onUpdateEntry}
        />
      ) : null}

      {section.key === "keycap_stem" ? (
        <KeycapStemEntryConfig
          entry={entry}
          serviceId={service.id}
          onUpdateEntry={onUpdateEntry}
        />
      ) : null}

      {section.key === "switch" && service.id === "svc-switch-lube" ? (
        <SwitchLubeEntryConfig
          entry={entry}
          serviceId={service.id}
          greaseOption={service.options.find((o) => o.label === "Loại grease")}
          onUpdateEntry={onUpdateEntry}
        />
      ) : null}

      {section.key === "switch" && service.id !== "svc-switch-lube" ? (
        <div className="space-y-1.5">
          <p className="text-[11px] font-bold text-on-surface-variant">
            Số lượng switch <span className="text-error">*</span>
          </p>
          <QuantityStepper
            value={entry.switchCount}
            onChange={(v) =>
              onUpdateEntry(service.id, entry.entryId, {
                switchCount: v,
              })
            }
            unit="switch"
          />
        </div>
      ) : null}

      <ServiceEntryOptions
        service={service}
        entry={entry}
        onSelectOptionValue={onSelectOptionValue}
      />

      {error ? <p className="text-xs font-bold text-error">{error}</p> : null}

      {previewPrice !== null && previewPrice > 0 ? (
        <p className="text-[11px] text-on-surface-variant">
          Tạm tính:{" "}
          <strong className="text-on-surface">{formatVND(previewPrice)}</strong>
        </p>
      ) : null}

      <textarea
        value={entry.lineNote}
        onChange={(e) =>
          onChangeLineNote(service.id, entry.entryId, e.target.value)
        }
        placeholder="Ghi chú riêng cho mục này (tuỳ chọn)"
        rows={2}
        className="w-full resize-none rounded-xl border border-outline-variant/20 bg-surface-container px-3 py-2.5 text-xs text-on-surface outline-none placeholder:text-on-surface-variant focus:ring-2 focus:ring-primary/30"
      />
    </div>
  );
}
