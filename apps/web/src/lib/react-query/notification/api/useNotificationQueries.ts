import { apiFetch } from "@/lib/api/fetch";
import type { NotificationItem } from "@/app/api/notifications/route";
import { appQueryKeys } from "@/lib/react-query/root";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/modules/user/client/AuthProvider";


export function useNotifications(enabled = true) {
  const queryClient = useQueryClient();
  const { user, loading } = useAuth();
  const previousUserId = useRef<string | null>(null);
  useEffect(() => {
    if (loading) return;
    const nextUserId = user?.id ?? null;
    if (previousUserId.current !== nextUserId) {
      void queryClient.removeQueries({ queryKey: ["notification"] });
      previousUserId.current = nextUserId;
    }
  }, [loading, queryClient, user?.id]);
  return useQuery<NotificationItem[]>({
    ...appQueryKeys.notification.list,
    staleTime: 120_000,
    enabled: enabled && !loading && Boolean(user),
    queryFn: async ({ signal }) => {
      const res = await apiFetch("/api/notifications?limit=50", { signal });
      if (!res.ok) throw new Error("Failed to load notifications");
      const data = (await res.json()) as {
        notifications?: NotificationItem[];
      };
      return data.notifications ?? [];
    },
  });
}
