"use client";

import { useGachaHistory } from "@/modules/gacha/client/queries";
import { REWARD_TYPE_LABEL } from "@/constants/gacha";

import Image from "@/components/ui/AdaptiveImage";
import { useEffect, useRef } from "react";

interface GachaHistoryDrawerProps {
  open: boolean;
  onClose: () => void;
  eventId: number;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("vi-VN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function GachaHistoryDrawer({
  open,
  onClose,
  eventId,
}: GachaHistoryDrawerProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  const {
    data,
    isFetching,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
    status,
  } = useGachaHistory(eventId, open);

  const entries = data?.pages.flatMap((p) => p.history) ?? [];
  const isInitialLoad = !data && isFetching;
  const isLoadingMore = isFetchingNextPage;

  // Infinite scroll via IntersectionObserver
  useEffect(() => {
    if (!sentinelRef.current || !hasNextPage || isFetching) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) fetchNextPage();
      },
      { threshold: 0.1 }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasNextPage, isFetching, fetchNextPage]);

  if (!open) return null;

  function renderContent() {
    if (isInitialLoad) {
      return [...Array(6)].map((_, i) => (
        <div
          key={i}
          className="flex animate-pulse items-center gap-3 rounded-xl bg-base-200 p-3"
        >
          <div className="h-10 w-10 shrink-0 rounded-full bg-base-300" />
          <div className="flex flex-1 flex-col gap-1.5">
            <div className="h-3 w-2/3 rounded bg-base-300" />
            <div className="h-2.5 w-1/3 rounded bg-base-300" />
          </div>
        </div>
      ));
    }

    if (entries.length === 0) {
      return (
        <p className="py-10 text-center text-sm text-base-content/50">
          Chưa có lượt chơi nào. Hãy thử vận may của bạn! 🎰
        </p>
      );
    }

    return entries.map((entry) => {
      const typeLabel = entry.reward
        ? (REWARD_TYPE_LABEL[entry.reward.reward_type] ??
          entry.reward.reward_type)
        : "—";
      const valueDisplay = entry.reward?.value
        ? entry.reward.reward_type === "point"
          ? `${entry.reward.value} điểm`
          : entry.reward.value
        : null;

      return (
        <div
          key={entry.id}
          className="flex items-center gap-3 rounded-xl border border-base-200 p-3"
        >
          <div
            className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full text-lg"
            style={{
              background: entry.reward?.is_golden
                ? "linear-gradient(135deg, #FCD34D, #F59E0B)"
                : "linear-gradient(135deg, #e5e7eb, #d1d5db)",
            }}
          >
            {entry.reward?.thumbnail_url ? (
              <Image
                src={entry.reward.thumbnail_url}
                alt=""
                className="h-full w-full rounded-full object-cover"
                fill
                sizes="48px"
              />
            ) : (
              <span>{entry.reward?.is_golden ? "★" : "🎱"}</span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-sm font-bold">
                {entry.reward?.name ?? "Unknown reward"}
              </p>
              <span className="shrink-0 text-xs text-base-content/80">
                {formatDate(entry.played_at)}
              </span>
            </div>
            <p className="text-xs text-base-content/50">
              {typeLabel} · {valueDisplay}
            </p>
          </div>
        </div>
      );
    });
  }

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/50" />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Play history"
        className="fixed bottom-0 left-0 right-0 z-[61] flex h-[55vh] flex-col rounded-t-2xl bg-base-100"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-base-200 px-4 pb-3 pt-4">
          <p className="text-base font-black">Lịch sử tham gia</p>
          <button
            aria-label="Đóng"
            onClick={onClose}
            className="rounded-xl border border-outline-variant/40 bg-surface-container px-3 py-1.5 text-xs font-bold text-on-surface transition-all active:scale-90"
          >
            Đóng
          </button>
        </div>

        {/* Content */}
        <div
          className={`flex flex-1 flex-col gap-2 px-4 py-3 ${isInitialLoad ? "overflow-y-hidden" : "overflow-y-auto"}`}
        >
          {renderContent()}

          {/* Infinite scroll sentinel */}
          <div ref={sentinelRef} />

          {isLoadingMore && (
            <div className="flex justify-center py-2">
              <span className="loading loading-spinner loading-sm" />
            </div>
          )}

          {!hasNextPage && entries.length > 0 && (
            <p className="py-3 text-center text-xs text-base-content/30">
              Đã xem hết!
            </p>
          )}
        </div>
      </aside>
    </>
  );
}
