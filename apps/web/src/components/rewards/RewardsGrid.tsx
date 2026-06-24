"use client";

import { Gift } from "lucide-react";
import type { RewardItem, RewardsResponse } from "@/types/reward";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useCallback, useRef } from "react";
import { RewardCard } from "./RewardCard";

const LIMIT = 12;

interface Props {
  balance: number;
  onRedeem: (r: RewardItem) => void;
}

export function RewardsGrid({ balance, onRedeem }: Props) {
  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } =
    useInfiniteQuery<RewardsResponse>({
      queryKey: ["rewards", "infinite"],
      queryFn: async ({ pageParam }) => {
        const res = await fetch(
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

  const rewards = data?.pages.flatMap((p) => p.rewards) ?? [];

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-2">
        {[1, 2, 3, 4].map((i) => (
          <RewardCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (rewards.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-16">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-container">
          <Gift size={24} className="text-outline-variant" />
        </div>
        <p className="text-center text-sm font-semibold text-on-surface-variant">
          Chưa có phần thưởng nào
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      {rewards.map((reward) => (
        <RewardCard
          key={reward.id}
          reward={reward}
          onRedeem={onRedeem}
          balance={balance}
        />
      ))}
      {hasNextPage && (
        <div ref={sentinelRef} className="col-span-2 flex justify-center py-4">
          {isFetchingNextPage ? (
            <span className="loading loading-spinner loading-sm text-primary" />
          ) : (
            <div className="h-4" />
          )}
        </div>
      )}
    </div>
  );
}

function RewardCardSkeleton() {
  return (
    <div className="animate-pulse space-y-2 rounded-2xl bg-surface-container-lowest p-3 shadow-ambient-sm">
      <div className="mx-auto h-10 w-10 rounded-xl bg-surface-container" />
      <div className="space-y-1.5 text-center">
        <div className="mx-auto h-3 w-3/4 rounded-full bg-surface-container" />
        <div className="mx-auto h-3 w-12 rounded-full bg-surface-container" />
      </div>
      <div className="mx-auto h-3 w-5/6 rounded-lg bg-surface-container" />
      <div className="flex flex-col items-center gap-1.5">
        <div className="mx-auto h-3 w-16 rounded-full bg-surface-container" />
        <div className="mx-auto h-7 w-full rounded-xl bg-surface-container" />
      </div>
    </div>
  );
}
