"use client";

import { TOKEN_ICON } from "@/lib/images";
import { useGachaMissions } from "@/lib/react-query/gacha/api/useGachaQueries";
import { CheckCircle2, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";

interface GachaMission {
  id: number;
  name: string;
  description: string | null;
  mission_type: string;
  requirement: {
    amount?: number;
    count?: number;
  };
  token_reward: number;
  progress: number | null;
  completed_at: string | null;
  claimed_at: string | null;
}

interface GachaMissionsDrawerProps {
  open: boolean;
  onClose: () => void;
  eventId: number;
  onClaimed?: (tokenReward: number) => void;
}

const MISSION_TYPE_LABEL: Record<string, string> = {
  first_login: "Đăng nhập lần đầu",
  login_count: "Đăng nhập lần đầu",
  order_min_price: "Đơn hàng tối thiểu",
  spend_amount: "Đơn hàng tối thiểu",
  order_count: "Hoàn thành đơn hàng",
  purchase: "Mua hàng",
  spin: "Quay thưởng",
  login: "Đăng nhập",
  referral: "Giới thiệu bạn",
  review: "Đánh giá",
};

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
            <h2 className="text-base font-black">Nhiệm vụ</h2>
            <p className="text-xs text-base-content/50">
              Hoàn thành nhiệm vụ để nhận token quay thưởng
            </p>
          </div>
          <button
            aria-label="Đóng"
            onClick={onClose}
            className="rounded-full p-1 hover:bg-base-200"
          >
            <X size={18} />
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
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(m.claimed_at != null);

  async function handleClaim() {
    setClaiming(true);
    try {
      const res = await fetch("/api/gacha/mission/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_id: eventId, mission_id: m.id }),
      });
      if (res.ok) {
        const json = await res.json();
        setClaimed(true);
        onClaimed(json.token_reward ?? 0);
      }
    } finally {
      setClaiming(false);
    }
  }
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
          {/* <div className="mb-0.5 flex items-center gap-1.5">
            <span className="rounded-full bg-base-200 px-1.5 py-0.5 text-[10px] font-semibold text-base-content/60">
              {typeLabel}
            </span>
            {isDone && (
              <CheckCircle2 size={14} className="shrink-0 text-success" />
            )}
          </div> */}
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
              objectFit="contain"
              layout="fill"
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
            disabled={claiming}
          >
            {claiming ? (
              <span className="loading loading-spinner loading-xs" />
            ) : (
              "Nhận thưởng 🎁"
            )}
          </button>
        ))}
    </div>
  );
}
