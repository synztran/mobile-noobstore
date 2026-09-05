"use client";

import { appQueryKeys } from "@/lib/react-query/root";
import type {
  GachaEventResponse,
  GachaHistoryPage,
  GachaMission,
} from "@/modules/gacha/types";
import { keepPreviousData, useInfiniteQuery, useMutation, useQuery } from "@tanstack/react-query";

export function useGachaEvent(eventId: number) {
  return useQuery<GachaEventResponse>({
    ...appQueryKeys.gacha.event(eventId),
    staleTime: 60_000,
    queryFn: () =>
      fetch(`/api/gacha?event_id=${eventId}`).then((r) => r.json()),
  });
}

export function useGachaHistory(eventId: number, enabled: boolean) {
  return useInfiniteQuery<GachaHistoryPage>({
    ...appQueryKeys.gacha.history(eventId),
    placeholderData: keepPreviousData,
    queryFn: async ({ pageParam }) => {
      const res = await fetch(
        `/api/gacha/history?event_id=${eventId}&page=${pageParam}`,
      );
      return res.json() as Promise<GachaHistoryPage>;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.hasMore ? allPages.length + 1 : undefined,
    enabled,
    staleTime: 30_000,
  });
}

export function useGachaMissions(eventId: number) {
  return useQuery<{ missions: GachaMission[] }>({
    ...appQueryKeys.gacha.missions(eventId),
    staleTime: 60_000,
    queryFn: () =>
      fetch(`/api/gacha/mission?event_id=${eventId}`).then((r) =>
        r.json(),
      ),
  });
}

export function useGachaDraw() {
  return useMutation({
    mutationFn: async (eventId: number) => {
      const res = await fetch("/api/gacha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_id: eventId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Draw failed");
      return data;
    },
  });
}

export function useClaimMission() {
  return useMutation({
    mutationFn: async ({
      eventId,
      missionId,
    }: {
      eventId: number;
      missionId: number;
    }) => {
      const res = await fetch("/api/gacha/mission/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_id: eventId, mission_id: missionId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Claim failed");
      return data as { token_reward: number };
    },
  });
}

export function useRecentWinners(eventId: number) {
  return useQuery<{ winners: Array<{ displayName: string; rewardName: string; isGolden: boolean }> }>({
    ...appQueryKeys.gacha.recentWinners(eventId),
    staleTime: 30_000,
    refetchInterval: 30_000,
    queryFn: () =>
      fetch(`/api/gacha/recent-winners?event_id=${eventId}&limit=15`).then(
        (r) => r.json(),
      ),
  });
}