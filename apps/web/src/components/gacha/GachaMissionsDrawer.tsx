"use client";

import { TOKEN_ICON } from "@/lib/images";
import {
  useClaimMission,
  useGachaMissions,
} from "@/lib/react-query/gacha/api/useGachaQueries";
import { MISSION_TYPE_LABEL } from "@/constants/gacha";
import type { GachaMission } from "@/lib/react-query/router/gacha";
import { CheckCircle2 } from "lucide-react";
import Image from "@/components/ui/AdaptiveImage";
import { useCallback, useEffect, useState } from "react";

interface GachaMissionsDrawerProps {
  open: boolean;
  onClose: () => void;
  eventId: number;
  onClaimed?: (tokenReward: number) => void;
}

export function GachaMissionsDrawer({
  open,
  onClose,
  eventId,
  onClaimed,
}: GachaMissionsDrawerProps) {
  const { data, isLoading, refetch } = useGachaMissions(eventId);

  function handleClaimed(tokenReward: number) {
    refetch();
    onClaimed?.(tokenReward);
  }

  const missions = data?.missions ?? [];
  const loading = isLoading && open;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/50" onClick={onClose} />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Danh sách nhiệm vụ"
        className="fixed bottom-0 left-0 right-0 z-[61] flex flex-col rounded-t-2xl bg-base-100"
        style={{ maxHeight: "82vh" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-base-200 px-4 pb-3 pt-4">
          <div>
            <p className="text-base font-black">Nhiệm vụ</p>
            <p className="text-xs text-base-content/50">
              Hoàn thành nhiệm vụ để nhận token quay thưởng
            </p>
          </div>
          <button
            aria-label="Đóng"
            onClick={onClose}
            className="rounded-xl border border-outline-variant/40 bg-surface-container px-3 py-1.5 text-xs font-bold text-on-surface transition-all active:scale-90"
          >
            Đóng
          </button>
        </div>

        {/* List */}
        <div className="flex flex-1 flex-col gap-2 overflow-y-auto px-3 py-3">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="skeleton h-24 w-full rounded-2xl" />
              ))
            : missions.map((m) => (
                <MissionCard
                  key={m.id}
                  mission={m}
                  eventId={eventId}
                  onClaimed={handleClaimed}
                />
              ))}
          {!loading && missions.length === 0 && (
            <p className="py-8 text-center text-sm text-base-content/50">
              Không có nhiệm vụ nào.
            </p>
          )}
        </div>
      </aside>
    </>
  );
}

function MissionCard({
  mission: m,
  eventId,
  onClaimed,
}: {
  mission: GachaMission;
  eventId: number;
  onClaimed: (tokenReward: number) => void;
}) {
  const claimMutation = useClaimMission();
  const [claimed, setClaimed] = useState(m.claimed_at != null);

  const handleClaim = useCallback(() => {
    claimMutation.mutate(
      { eventId, missionId: m.id },
      {
        onSuccess: (data) => {
          setClaimed(true);
          onClaimed(data.token_reward ?? 0);
        },
      },
    );
  }, [claimMutation, eventId, m.id, onClaimed]);
  const progress = m.progress ?? 0;
  const requirement = m.requirement.amount ?? m.requirement.count ?? 1;
  const percent = Math.min(100, Math.round((progress / requirement) * 100));
  const isDone = m.completed_at != null;
  const typeLabel = MISSION_TYPE_LABEL[m.mission_type] ?? m.mission_type;

  return (
    <div
      className={`flex flex-col gap-2 rounded-2xl border p-3 ${
        isDone
          ? "border-success/40 bg-success/5"
          : "border-base-200 bg-base-100"
      }`}
    >
      {/* Top row: name + reward */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1 text-xs text-base-content/50">
            <p className="text-sm font-bold leading-tight">{m.name}</p>
            {isDone && (
              <CheckCircle2 size={14} className="shrink-0 text-success" />
            )}
          </div>
          {m.description && (
            <p className="mt-0.5 line-clamp-2 text-xs text-base-content/50">
              {m.description}
            </p>
          )}
        </div>
        {/* Token reward */}
        <div className="flex items-center gap-1 rounded-xl border border-amber-400/30 bg-amber-400/10 px-2 py-1">
          <div className="relative h-6 w-6">
            <Image
              src={TOKEN_ICON}
              alt="Token"
              fill
              sizes="24px"
              className="object-contain"
            />
          </div>
          <span className="text-xs font-black text-amber-600">
            +{m.token_reward}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div>
        <div className="mb-1 flex justify-between text-[10px] text-base-content/50">
          <span>Tiến độ</span>
          <span>
            {progress} / {requirement}
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-base-200">
          <div
            className={`h-full rounded-full transition-all ${
              isDone ? "bg-green-400" : "bg-primary"
            }`}
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      {/* Claim / Claimed button */}
      {isDone &&
        (claimed ? (
          <button className="btn btn-success btn-sm w-full" disabled>
            Đã nhận thưởng ✓
          </button>
        ) : (
          <button
            className="btn btn-warning btn-sm w-full"
            onClick={handleClaim}
            disabled={claimMutation.isPending}
          >
            {claimMutation.isPending ? (
              <span className="loading loading-spinner loading-xs" />
            ) : (
              "Nhận thưởng 🎁"
            )}
          </button>
        ))}
    </div>
  );
}
