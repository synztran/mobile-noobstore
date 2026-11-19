import { apiFetch } from "@/lib/api/fetch";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { NotificationItem } from "@/app/api/notifications/route";


export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const res = await apiFetch("/api/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId }),
      });
      if (!res.ok) throw new Error("Failed to mark notification as read");
    },
    onMutate: async (notificationId) => {
      await queryClient.cancelQueries({ queryKey: ["notification"] });
      const previous = queryClient.getQueryData<NotificationItem[]>([
        "notification",
        "list",
      ]);
      queryClient.setQueryData<NotificationItem[]>(
        ["notification", "list"],
        (items) =>
          items?.map((item) =>
            item.id === notificationId
              ? { ...item, read_at: new Date().toISOString() }
              : item
          )
      );
      return { previous };
    },
    onError: (_error, _notificationId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["notification", "list"], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["notification"] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const res = await apiFetch("/api/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAll: true }),
      });
      if (!res.ok) throw new Error("Failed to mark all notifications as read");
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["notification"] });
      const previous = queryClient.getQueryData<NotificationItem[]>([
        "notification",
        "list",
      ]);
      const readAt = new Date().toISOString();
      queryClient.setQueryData<NotificationItem[]>(
        ["notification", "list"],
        (items) => items?.map((item) => ({ ...item, read_at: readAt }))
      );
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["notification", "list"], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["notification"] });
    },
  });
}

export function useSendTestPush() {
  return useMutation({
    mutationFn: async () => {
      const res = await apiFetch("/api/notifications/push-self", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "NoobStore",
          body: "Đây là thông báo thử nghiệm cho PWA",
          deepLink: "/profile/notifications",
          type: "test",
        }),
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(payload?.error ?? "Gửi test push thất bại");
      }
    },
  });
}
