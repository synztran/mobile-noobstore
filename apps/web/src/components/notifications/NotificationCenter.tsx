"use client";

import { usePushNotifications } from "@/hooks/usePushNotifications";
import { toast } from "@/lib/toast";
import { useEffect, useMemo, useState } from "react";

interface NotificationItem {
  id: string;
  title: string;
  body: string;
  type: string;
  deep_link: string | null;
  metadata: unknown;
  read_at: string | null;
  created_at: string;
}

export function NotificationCenter() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const {
    isSupported,
    permission,
    subscribe,
    unsubscribe,
    loading: pushLoading,
  } = usePushNotifications();

  const unreadCount = useMemo(
    () => items.filter((item) => !item.read_at).length,
    [items]
  );

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/notifications?limit=50");
        if (!res.ok) return;
        const data = (await res.json()) as {
          notifications?: NotificationItem[];
        };
        setItems(data.notifications ?? []);
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, []);

  const markOneRead = async (id: string) => {
    setBusy(true);
    try {
      await fetch("/api/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId: id }),
      });
      setItems((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, read_at: new Date().toISOString() } : item
        )
      );
    } finally {
      setBusy(false);
    }
  };

  const markAllRead = async () => {
    setBusy(true);
    try {
      await fetch("/api/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAll: true }),
      });
      setItems((prev) =>
        prev.map((item) => ({
          ...item,
          read_at: item.read_at ?? new Date().toISOString(),
        }))
      );
    } finally {
      setBusy(false);
    }
  };

  const sendTestPush = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/notifications/push-self", {
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
      toast.success("Đã gửi test notification");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Đã có lỗi xảy ra");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4 px-4 pb-24 pt-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
            Notification Center
          </p>
          <h1 className="text-2xl font-black text-on-surface">Thông báo</h1>
        </div>
        {unreadCount > 0 ? (
          <button
            type="button"
            onClick={() => void markAllRead()}
            disabled={busy}
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
          {/* <button
						type="button"
						onClick={() => void sendTestPush()}
						disabled={busy}
						className="h-9 px-3 rounded-lg bg-surface-container text-on-surface text-[10px] font-black uppercase tracking-wider disabled:opacity-50">
						Gửi test push
					</button> */}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="animate-pulse space-y-2 rounded-2xl bg-surface-container p-4"
            >
              <div className="h-4 w-2/3 rounded-full bg-surface-container-high" />
              <div className="h-3 w-full rounded-full bg-surface-container-high" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl bg-surface-container-lowest p-8 text-center text-sm text-on-surface-variant">
          Chưa có thông báo nào.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <button
              type="button"
              key={item.id}
              onClick={() => void markOneRead(item.id)}
              disabled={busy}
              className={`w-full rounded-2xl p-4 text-left transition-colors ${
                item.read_at
                  ? "bg-surface-container"
                  : "border border-primary/25 bg-surface-container-lowest"
              }`}
            >
              <p className="text-sm font-black text-on-surface">{item.title}</p>
              <p className="mt-1 text-xs text-on-surface-variant">
                {item.body}
              </p>
              <p className="mt-2 text-[10px] uppercase tracking-wider text-on-surface-variant">
                {new Date(item.created_at).toLocaleString("vi-VN")}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
