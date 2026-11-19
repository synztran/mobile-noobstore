"use client";

import { apiFetch } from "@/lib/api/fetch";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { appQueryKeys } from "@/lib/react-query/root";
import type { CheckinCalendarResponse, CheckinClaimResult, CheckinReward } from "../types";


export function useCheckinCalendar(month: string, options?: { enabled?: boolean }) {
  return useQuery({
    ...appQueryKeys.checkin.calendar(month),
    queryFn: async (): Promise<CheckinCalendarResponse> => {
      const response = await apiFetch(
        `/api/checkin/calendar?month=${encodeURIComponent(month)}`
      );
      if (!response.ok) throw new Error("Không thể tải lịch điểm danh");
      return response.json();
    },
    enabled: options?.enabled,
  });
}

export function useCheckinRewards(options?: { enabled?: boolean }) {
  return useQuery({
    ...appQueryKeys.checkin.rewards(),
    queryFn: async (): Promise<CheckinReward[]> => {
      const response = await apiFetch("/api/checkin/rewards");
      if (!response.ok) return [];
      return response.json();
    },
    staleTime: 60 * 1000,
    enabled: options?.enabled,
  });
}

export function useClaimCheckin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<CheckinClaimResult> => {
      const response = await apiFetch("/api/checkin/claim", { method: "POST" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Không thể điểm danh");
      return body;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["checkin"] });
      await queryClient.invalidateQueries({ queryKey: ["points"] });
      await queryClient.invalidateQueries({ queryKey: ["user"] });
    },
  });
}
