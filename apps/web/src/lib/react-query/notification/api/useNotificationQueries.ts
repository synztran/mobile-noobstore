import type { NotificationItem } from "@/app/api/notifications/route";
import { appQueryKeys } from "@/lib/react-query/root";
import { useQuery } from "@tanstack/react-query";

export function useNotifications() {
  return useQuery<NotificationItem[]>({
    ...appQueryKeys.notification.list,
    queryFn: async () => {
      const res = await fetch("/api/notifications?limit=50");
      if (!res.ok) throw new Error("Failed to load notifications");
      const data = (await res.json()) as {
        notifications?: NotificationItem[];
      };
      return data.notifications ?? [];
    },
  });
}
