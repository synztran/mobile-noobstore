"use client";

import { useNotifications } from "@/lib/react-query/notification/api/useNotificationQueries";
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useSendTestPush,
} from "@/lib/react-query/notification/api/useNotificationMutations";
import { toast } from "@/lib/toast";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import NotificationList from "./NotificationList";

export function NotificationCenter() {
  const router = useRouter();
  const { data: items, isLoading } = useNotifications();
  const markOneRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const sendTestPush = useSendTestPush();
  const {
    isSupported,
    permission,
    subscribe,
    unsubscribe,
    loading: pushLoading,
  } = usePushNotifications();

  const unreadCount = useMemo(
    () => items?.filter((item) => !item.read_at).length ?? 0,
    [items],
  );

  const handleMarkAllRead = () => {
    markAllRead.mutate(undefined, {
      onError: () => toast.error("Đánh dấu đã đọc thất bại"),
    });
  };

  const handleMarkOneRead = (id: string) => {
    markOneRead.mutate(id, {
      onError: () => toast.error("Đánh dấu đã đọc thất bại"),
    });
  };

  const handleSendTestPush = () => {
    sendTestPush.mutate(undefined, {
      onSuccess: () => toast.success("Đã gửi test notification"),
      onError: (err) =>
        toast.error(err instanceof Error ? err.message : "Đã có lỗi xảy ra"),
    });
  };

  return (
    <div className="space-y-4 px-4 pb-24 pt-3">
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label="Quay lại"
          onClick={() => router.push("/profile")}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface-container text-on-surface transition-transform active:scale-90"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
            Trung tâm thông báo
          </p>
          <p className="text-2xl font-black text-on-surface">Thông báo</p>
        </div>
        {unreadCount > 0 ? (
          <button
            type="button"
            onClick={handleMarkAllRead}
            disabled={markAllRead.isPending}
            className="text-xs font-black uppercase tracking-wide text-primary disabled:opacity-50"
          >
            Đánh dấu đã đọc
          </button>
        ) : null}
      </div>

      <div className="space-y-3 rounded-3xl bg-surface-container-lowest p-4 shadow-ambient-sm">
        <p className="text-xs font-black uppercase tracking-wider text-on-surface-variant">
          Push notification
        </p>
        {isSupported ? (
          <p className="text-xs text-on-surface-variant">
            Trạng thái quyền: <span className="font-bold">{permission}</span>
          </p>
        ) : (
          <p className="text-xs text-error">
            Thiết bị/trình duyệt này chưa hỗ trợ Web Push.
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void subscribe()}
            disabled={!isSupported || pushLoading}
            className="h-9 rounded-lg bg-blue-600 px-3 text-[10px] font-black uppercase tracking-wider text-white disabled:opacity-50"
          >
            Bật thông báo
          </button>
          <button
            type="button"
            onClick={() => void unsubscribe()}
            disabled={!isSupported || pushLoading}
            className="h-9 rounded-lg bg-surface-container px-3 text-[10px] font-black uppercase tracking-wider text-on-surface disabled:opacity-50"
          >
            Tắt thông báo
          </button>
        </div>
      </div>

      <NotificationList
        items={items}
        isLoading={isLoading}
        onMarkRead={handleMarkOneRead}
      />
    </div>
  );
}
