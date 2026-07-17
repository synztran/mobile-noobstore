"use client";

import type { CustomerRank } from "@/types/rank";
import { RANK_BENEFIT_LABELS } from "@/constants/rank";
import { formatVND } from "@/lib/currency";
import { RankBadge } from "./RankBadge";
import {
  Check,
  CheckCircle,
  Gift,
  Headphones,
  Lock,
  Percent,
  Star,
  Truck,
  X,
} from "lucide-react";
import type { ElementType } from "react";

const BENEFIT_ICONS: Record<string, ElementType> = {
  pointsMultiplier: Star,
  discountPercent: Percent,
  freeShipping: Truck,
  exclusiveVoucher: Gift,
  prioritySupport: Headphones,
};

interface Props {
  open: boolean;
  onClose: () => void;
  currentRank: CustomerRank | null;
  allRanks: CustomerRank[];
}

function BenefitRow({
  icon: IconComp,
  label,
  enabled,
  value,
}: {
  icon: ElementType;
  label: string;
  enabled: boolean;
  value: string;
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${enabled ? "bg-surface-container" : "bg-surface-container-low opacity-50"}`}
    >
      <IconComp
        className={`h-5 w-5 ${enabled ? "text-primary" : "text-on-surface-variant"}`}
      />
      <div className="flex-1">
        <p
          className={`text-xs font-bold ${enabled ? "text-on-surface" : "text-on-surface-variant"}`}
        >
          {label}
        </p>
        <p
          className={`text-[10px] ${enabled ? "text-on-surface-variant" : "text-outline"}`}
        >
          {value}
        </p>
      </div>
      {enabled ? (
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10">
          <Check className="h-3 w-3 text-primary" />
        </span>
      ) : (
        <span className="bg-surface-container-higher flex h-5 w-5 items-center justify-center rounded-full">
          <X className="h-3 w-3 text-outline" />
        </span>
      )}
    </div>
  );
}

function formatBenefitValue(benefitKey: string, rank: CustomerRank): string {
  const b = rank.benefits;
  switch (benefitKey) {
    case "pointsMultiplier":
      return b.flags.pointsMultiplierEnabled && b.pointsMultiplier > 1
        ? `${b.pointsMultiplier}x điểm NSP`
        : b.pointsMultiplier > 1
          ? `${b.pointsMultiplier}x`
          : "Cơ bản";
    case "discountPercent":
      return b.flags.discountPercentEnabled && b.discountPercent > 0
        ? `Giảm ${b.discountPercent}% đơn hàng`
        : "Không giảm giá";
    case "freeShipping":
      return b.flags.freeShippingEnabled && b.freeShipping
        ? "Miễn phí vận chuyển"
        : "Tính phí ship";
    case "exclusiveVoucher":
      return b.flags.exclusiveVoucherEnabled &&
        b.exclusiveVoucherFrequency !== "none"
        ? `Voucher ${b.exclusiveVoucherFrequency === "monthly" ? "hằng tháng" : "định kỳ"}`
        : "Không có";
    case "prioritySupport":
      return b.flags.prioritySupportEnabled && b.prioritySupport
        ? "Hỗ trợ ưu tiên"
        : "Hỗ trợ thường";
    default:
      return "";
  }
}

function BenefitChip({
  enabled,
  children,
}: {
  enabled: boolean;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`inline-block rounded-full px-1.5 py-0.5 text-[9px] font-bold ${
        enabled
          ? "bg-primary-fixed/20 text-primary"
          : "bg-surface-container-high text-outline line-through"
      }`}
    >
      {children}
    </span>
  );
}

function getRankChips(rank: CustomerRank) {
  const b = rank.benefits;
  return [
    {
      key: "pointsMultiplier",
      label: `${b.pointsMultiplier}x`,
      enabled: b.flags.pointsMultiplierEnabled && b.pointsMultiplier > 1,
    },
    {
      key: "discountPercent",
      label: `${b.discountPercent}%`,
      enabled: b.flags.discountPercentEnabled && b.discountPercent > 0,
    },
    {
      key: "freeShipping",
      label: "ship",
      enabled: b.flags.freeShippingEnabled && b.freeShipping,
    },
    {
      key: "exclusiveVoucher",
      label: "vouch",
      enabled:
        b.flags.exclusiveVoucherEnabled &&
        b.exclusiveVoucherFrequency !== "none",
    },
    {
      key: "prioritySupport",
      label: "support",
      enabled: b.flags.prioritySupportEnabled && b.prioritySupport,
    },
  ];
}

export function RankBenefitModal({
  open,
  onClose,
  currentRank,
  allRanks,
}: Props) {
  if (!currentRank) return null;

  return (
    <dialog
      className={`modal modal-bottom sm:modal-middle ${open ? "modal-open" : ""}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-box flex max-h-[80dvh] flex-col rounded-t-2xl bg-surface px-0 pb-0 pt-0">
        {/* Fixed Header */}
        <div className="shrink-0 px-6 pb-4 pt-6">
          <div className="flex items-center gap-3">
            <RankBadge rank={currentRank} size="lg" />
            <div>
              <p className="text-lg font-black text-on-surface">
                {currentRank.name}
              </p>
              <p className="text-xs font-bold text-on-surface-variant">
                Level {currentRank.level} — Quyền lợi
              </p>
            </div>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-6">
          {/* Current rank benefits */}
          <div className="mb-4 space-y-2">
            {Object.keys(RANK_BENEFIT_LABELS).map((key) => {
              const IconComp = BENEFIT_ICONS[key];
              const meta = RANK_BENEFIT_LABELS[key];
              const value = formatBenefitValue(key, currentRank);
              const flagKey =
                `${key.charAt(0).toLowerCase() + key.slice(1)}Enabled` as keyof typeof currentRank.benefits.flags;
              const enabled = currentRank.benefits.flags[flagKey] as boolean;
              return (
                <BenefitRow
                  key={key}
                  icon={IconComp}
                  label={meta.label}
                  enabled={enabled}
                  value={value}
                />
              );
            })}
          </div>

          {/* All ranks comparison */}
          {allRanks.length > 1 && (
            <>
              <div className="mb-3 border-t border-outline-variant/20 pt-4">
                <p className="text-xs font-black uppercase tracking-widest text-on-surface-variant">
                  Tất cả rank
                </p>
              </div>
              <div className="space-y-2 pb-4">
                {allRanks.map((rank) => {
                  const isCurrent = rank.id === currentRank.id;
                  const isLocked = rank.level > currentRank.level;
                  const chips = getRankChips(rank);
                  return (
                    <div
                      key={rank.id}
                      className={`flex items-start gap-3 rounded-xl px-3 py-2.5 ${
                        isCurrent
                          ? "bg-primary-fixed/10 ring-1 ring-primary/20"
                          : "bg-surface-container-low"
                      } ${isLocked ? "opacity-40" : ""}`}
                    >
                      <RankBadge rank={rank} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p
                          className={`text-xs font-bold ${isCurrent ? "text-primary" : "text-on-surface"}`}
                        >
                          {rank.name}
                          {isCurrent && " (Hiện tại)"}
                        </p>
                        <p className="text-[10px] text-on-surface-variant">
                          {formatVND(rank.minTotalSpent)} — {rank.minOrderCount}{" "}
                          đơn
                        </p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {chips.map((chip) => (
                            <BenefitChip key={chip.key} enabled={chip.enabled}>
                              {chip.label}
                            </BenefitChip>
                          ))}
                        </div>
                      </div>
                      {isLocked ? (
                        <Lock className="h-3.5 w-3.5 shrink-0 text-on-surface-variant" />
                      ) : (
                        <CheckCircle className="h-3.5 w-3.5 shrink-0 text-success" />
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Fixed Footer */}
        <div className="shrink-0 border-t border-outline-variant/20 px-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-4">
          <button
            onClick={onClose}
            className="w-full rounded-xl bg-on-surface py-3 text-[10px] font-black uppercase tracking-widest text-surface transition-transform active:scale-95"
          >
            Đóng
          </button>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button onClick={onClose}>close</button>
      </form>
    </dialog>
  );
}
