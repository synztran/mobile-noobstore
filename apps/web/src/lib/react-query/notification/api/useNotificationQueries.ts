import { apiFetch } from "@/lib/api/fetch";
import type { NotificationItem } from "@/app/api/notifications/route";
import { appQueryKeys } from "@/lib/react-query/root";
import { useQuery } from "@tanstack/react-query";


export function useNotifications(enabled = true) {
  return useQuery<NotificationItem[]>({
    ...appQueryKeys.notification.list,
    staleTime: 120_000,
    enabled,
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
