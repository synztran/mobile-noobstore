"use client";

import { apiFetch } from "@/lib/api/fetch";
import { ArrowDown, Gift } from "lucide-react";
import type { RewardItem, RewardsResponse } from "@/types/reward";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useCallback, useRef } from "react";
import { RewardCard } from "./RewardCard";

const LIMIT = 12;

interface Props {
  balance: number;
  dailyCheckinBalance?: number;
  onRedeem: (r: RewardItem) => void;
}

export function RewardsGrid({ balance, dailyCheckinBalance = 0, onRedeem }: Props) {
  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } =
    useInfiniteQuery<RewardsResponse>({
      queryKey: ["rewards", "infinite"],
      queryFn: async ({ pageParam }) => {
        const res = await apiFetch(
          `/api/rewards?offset=${pageParam}&limit=${LIMIT}`
        );
        if (!res.ok) throw new Error("Failed to fetch rewards");
        return res.json();
      },
      initialPageParam: 0,
      getNextPageParam: (lastPage, _pages) => {
        if (!lastPage.hasMore) return undefined;
        return _pages.length * LIMIT;
      },
    });

  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (observerRef.current) observerRef.current.disconnect();
      if (!node || !hasNextPage || isFetchingNextPage) return;
      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0]?.isIntersecting) fetchNextPage();
        },
        { rootMargin: "200px" }
      );
      observerRef.current.observe(node);
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage]
  );

  const loadMore = () => {
    if (!isFetchingNextPage) void fetchNextPage();
  };

  const rewards = data?.pages.flatMap((p) => p.rewards) ?? [];

  if (isLoading) {
    return (
      <>
        <div className="mb-4 hidden items-end justify-between lg:flex">
          <div>
            <h2 className="text-xl font-extrabold tracking-tight text-on-surface">
              Quà dành cho bạn
            </h2>
            <p className="mt-1 text-sm text-on-surface-variant">
              Đổi điểm NSP hoặc điểm chuyên cần lấy phần thưởng
            </p>
          </div>
          <span className="text-xs text-on-surface-variant">Đang tải quà…</span>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-2 lg:gap-4">
          {[1, 2, 3, 4].map((i) => (
            <RewardCardSkeleton key={i} />
          ))}
        </div>
      </>
    );
  }

  if (rewards.length === 0) {
    return (
      <>
        <div className="mb-4 hidden items-end justify-between lg:flex">
          <div>
            <h2 className="text-xl font-extrabold tracking-tight text-on-surface">
              Quà dành cho bạn
            </h2>
            <p className="mt-1 text-sm text-on-surface-variant">
              Đổi điểm NSP hoặc điểm chuyên cần lấy phần thưởng
            </p>
          </div>
          <span className="text-xs text-on-surface-variant">0 phần thưởng</span>
        </div>
        <div className="flex flex-col items-center gap-4 py-16 lg:col-span-9">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-container">
            <Gift size={24} className="text-outline-variant" />
          </div>
          <p className="text-center text-sm font-semibold text-on-surface-variant">
            Chưa có phần thưởng nào
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="mb-4 hidden items-end justify-between lg:flex">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight text-on-surface">
            Quà dành cho bạn
          </h2>
          <p className="mt-1 text-sm text-on-surface-variant">
            Đổi điểm NSP hoặc điểm chuyên cần lấy phần thưởng
          </p>
        </div>
        <span className="text-xs text-on-surface-variant">
          {data?.pages[0]?.total ?? rewards.length} phần thưởng
        </span>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-2 lg:gap-4">
        {rewards.map((reward) => (
          <RewardCard
            key={reward.id}
            reward={reward}
            onRedeem={onRedeem}
            balance={balance}
            dailyCheckinBalance={dailyCheckinBalance}
          />
        ))}
        {hasNextPage && (
          <div
            ref={sentinelRef}
            className="col-span-full flex justify-center py-4 lg:hidden"
          >
            {isFetchingNextPage ? (
              <span className="loading loading-spinner loading-sm text-primary" />
            ) : (
              <div className="h-4" />
            )}
          </div>
        )}
      </div>
      {hasNextPage && (
        <button
          type="button"
          onClick={loadMore}
          disabled={isFetchingNextPage}
          className="mx-auto mt-3 hidden items-center gap-1 rounded-full bg-surface-container px-4 py-2 text-xs font-bold text-primary hover:bg-surface-container-high disabled:opacity-60 lg:flex"
        >
          {isFetchingNextPage ? "Đang tải…" : "Xem thêm"}{" "}
          <ArrowDown size={14} />
        </button>
      )}
    </>
  );
}

function RewardCardSkeleton() {
  return (
    <div className="flex min-h-[140px] animate-pulse rounded-2xl bg-surface-container-lowest shadow-ambient-sm lg:rounded-xl">
      <div className="w-[116px] shrink-0 rounded-l-2xl bg-surface-container/60 lg:rounded-l-xl" />
      <div className="flex flex-1 flex-col justify-between p-3.5">
        <div className="space-y-2">
          <div className="flex justify-between">
            <div className="h-3.5 w-16 rounded bg-surface-container" />
            <div className="h-3.5 w-14 rounded bg-surface-container" />
          </div>
          <div className="h-4 w-3/4 rounded bg-surface-container" />
          <div className="h-3 w-1/2 rounded bg-surface-container" />
        </div>
        <div className="flex items-center justify-between border-t border-surface-container/60 pt-2">
          <div className="h-3.5 w-20 rounded bg-surface-container" />
          <div className="h-7 w-20 rounded-full bg-surface-container" />
        </div>
      </div>
    </div>
  );
}
