"use client";

import { formatVND } from "@/lib/currency";
import clsx from "clsx";
import { Plus, Trash2 } from "lucide-react";
import { KEYCAP_STEM_UNIT_PRICES } from "./bookingHelpers";
import { QuantityStepper } from "./QuantityStepper";
import type { ServiceEntryDraft } from "./types";

const KEYCAP_UNITS = ["1u", "2u"] as const;
export type KeycapUnit = (typeof KEYCAP_UNITS)[number];

export interface KeycapStemGroup {
  unit: KeycapUnit;
  quantity: number;
}

const DEFAULT_GROUP: KeycapStemGroup = { unit: "1u", quantity: 1 };

export function getDefaultKeycapStemGroups(): KeycapStemGroup[] {
  return [{ ...DEFAULT_GROUP }];
}

export function getKeycapStemTotal(entry: ServiceEntryDraft): number {
  return (entry.keycapStemGroups ?? [{ ...DEFAULT_GROUP }]).reduce(
    (acc, g) => acc + g.quantity,
    0
  );
}

interface KeycapStemEntryConfigProps {
  entry: ServiceEntryDraft;
  serviceId: string;
  onUpdateEntry: (
    serviceId: string,
    entryId: string,
    update: Partial<ServiceEntryDraft>
  ) => void;
}

export function KeycapStemEntryConfig({
  entry,
  serviceId,
  onUpdateEntry,
}: KeycapStemEntryConfigProps) {
  const groups: KeycapStemGroup[] = entry.keycapStemGroups ?? [
    { ...DEFAULT_GROUP },
  ];

  function updateGroups(next: KeycapStemGroup[]) {
    onUpdateEntry(serviceId, entry.entryId, { keycapStemGroups: next });
  }

  function addGroup() {
    if (groups.length >= 2) return;
    const usedUnits = new Set(groups.map((g) => g.unit));
    const availableUnit = KEYCAP_UNITS.find((u) => !usedUnits.has(u)) ?? "2u";
    updateGroups([...groups, { unit: availableUnit, quantity: 1 }]);
  }

  function removeGroup(idx: number) {
    if (groups.length === 1) return;
    updateGroups(groups.filter((_, i) => i !== idx));
  }

  function updateGroup(idx: number, patch: Partial<KeycapStemGroup>) {
    updateGroups(groups.map((g, i) => (i === idx ? { ...g, ...patch } : g)));
  }

  return (
    <div className="space-y-2">
      <p className="text-[11px] font-bold text-on-surface-variant">
        Keycap cần sửa <span className="text-error">*</span>
      </p>

      <div className="space-y-4">
        {groups.map((group, idx) => (
          <div
            key={idx}
            className="relative rounded-xl border border-outline-variant/30 bg-surface-container px-3 py-2"
          >
            <div className="flex flex-1 items-center gap-2">
              {/* Unit selector */}
              <div className="flex gap-1">
                {KEYCAP_UNITS.map((u) => {
                  const takenByOther = groups.some(
                    (g, i) => i !== idx && g.unit === u
                  );
                  return (
                    <button
                      key={u}
                      type="button"
                      disabled={takenByOther}
                      onClick={() => updateGroup(idx, { unit: u })}
                      className={clsx(
                        "rounded-lg border px-2 py-1 text-left text-[11px] font-black transition-colors",
                        takenByOther
                          ? "cursor-not-allowed border-outline-variant/20 bg-surface-container-low text-on-surface/30"
                          : group.unit === u
                            ? "border-primary bg-primary text-on-primary"
                            : "border-outline-variant/30 bg-surface-container text-on-surface"
                      )}
                    >
                      <div className="flex flex-col">
                        {u}
                        <span
                          className={clsx(
                            "text-[10px] font-normal",
                            takenByOther
                              ? "opacity-30"
                              : group.unit === u
                                ? "opacity-80"
                                : "opacity-60"
                          )}
                        >
                          {formatVND(KEYCAP_STEM_UNIT_PRICES[u]!)}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="h-5 w-px shrink-0 bg-outline-variant/20" />

              {/* Quantity stepper */}
              <QuantityStepper
                value={group.quantity}
                onChange={(v) => updateGroup(idx, { quantity: v ?? 1 })}
                unit="keycap"
              />
            </div>

            {/* Remove row */}
            {groups.length > 1 ? (
              <button
                type="button"
                onClick={() => removeGroup(idx)}
                className="absolute -right-1 -top-3 flex h-5 w-5 items-center justify-center rounded-full border border-red-400 bg-white text-error transition-colors hover:bg-error/10"
              >
                <Trash2 size={14} className="" />
              </button>
            ) : null}
          </div>
        ))}
      </div>

      {groups.length < 2 ? (
        <button
          type="button"
          onClick={addGroup}
          className="flex items-center gap-1.5 text-[11px] font-semibold text-primary hover:underline"
        >
          <Plus size={12} />
          Thêm nhóm keycap
        </button>
      ) : null}

      {groups.length > 0 ? (
        <p className="text-[11px] text-on-surface-variant">
          Tổng:{" "}
          <strong className="text-on-surface">
            {groups.reduce((acc, g) => acc + g.quantity, 0)} keycap
          </strong>
        </p>
      ) : null}
    </div>
  );
}
