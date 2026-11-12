"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { appQueryKeys } from "@/lib/react-query/root";
import type { CheckinCalendarResponse, CheckinClaimResult } from "../types";

export function useCheckinCalendar(month: string) {
  return useQuery({
    ...appQueryKeys.checkin.calendar(month),
    queryFn: async (): Promise<CheckinCalendarResponse> => {
      const response = await fetch(
        `/api/checkin/calendar?month=${encodeURIComponent(month)}`
      );
      if (!response.ok) throw new Error("Không thể tải lịch điểm danh");
      return response.json();
    },
  });
}

export function useClaimCheckin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<CheckinClaimResult> => {
      const response = await fetch("/api/checkin/claim", { method: "POST" });
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
