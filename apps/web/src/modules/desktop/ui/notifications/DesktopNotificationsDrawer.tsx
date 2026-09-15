"use client";

import { usePreventScroll } from "@/hooks/usePreventScroll";
import { useNotifications } from "@/lib/react-query/notification/api/useNotificationQueries";
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
} from "@/lib/react-query/notification/api/useNotificationMutations";
import { toast } from "@/lib/toast";
import NotificationList from "@/components/notifications/NotificationList";
import { useAuth } from "@/modules/user/client/AuthProvider";
import { Bell, CheckCheck, ChevronRight, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo } from "react";

interface DesktopNotificationsDrawerProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Desktop/tablet notification drawer. A 32rem top-drop panel anchored to the
 * right edge below the topbar — opens from the Bell in DesktopTopBar.
 */
export function DesktopNotificationsDrawer({
  open,
  onClose,
}: DesktopNotificationsDrawerProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { data: items, isLoading } = useNotifications();
  const markOneRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const unreadCount = useMemo(
    () => items?.filter((item) => !item.read_at).length ?? 0,
    [items]
  );

  usePreventScroll(open);

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

  const handleViewAll = () => {
    router.push("/profile/notifications");
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[35] bg-on-surface/20 backdrop-blur-[2px] transition-opacity duration-300 ${
          open
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
      />

      {/* Top-drop panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Thông báo"
        className={`fixed right-0 top-16 z-[40] flex max-h-[min(70dvh,36rem)] w-full max-w-lg flex-col overflow-hidden rounded-b-2xl border-b border-l border-on-surface/10 bg-surface shadow-2xl transition-transform duration-300 ease-out ${
          open ? "translate-y-0" : "-translate-y-[calc(100%+4rem)]"
        }`}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-on-surface/10 px-5 py-4">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-black tracking-tight text-on-surface">
              Thông báo
            </h2>
            {unreadCount > 0 && (
              <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-white">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                disabled={markAllRead.isPending}
                className="inline-flex items-center gap-1 rounded-xl border border-outline-variant/40 bg-surface-container px-3 py-1.5 text-xs font-bold text-primary transition-all active:scale-90 disabled:opacity-50"
              >
                <CheckCheck size={14} />
                Đã đọc
              </button>
            )}
            <button
              onClick={onClose}
              aria-label="Đóng thông báo"
              className="rounded-lg p-2 text-on-surface-variant transition-colors hover:bg-on-surface/5"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-5 py-4">
          {user ? (
            <NotificationList
              items={items}
              isLoading={isLoading}
              onMarkRead={handleMarkOneRead}
            />
          ) : (
            <div className="flex flex-col items-center gap-3 rounded-2xl bg-surface-container-lowest p-8 text-center">
              <p className="text-sm font-semibold text-on-surface-variant">
                Đăng nhập để xem thông báo
              </p>
              <button
                onClick={() => {
                  onClose();
                  router.push("/login");
                }}
                className="rounded-full bg-primary px-6 py-2 text-xs font-bold uppercase tracking-widest text-white shadow-ambient-sm transition-all active:scale-95"
              >
                Đăng nhập
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        {user && (
          <button
            onClick={handleViewAll}
            className="flex shrink-0 items-center justify-center gap-1 border-t border-on-surface/10 py-3 text-xs font-black uppercase tracking-widest text-primary transition-colors hover:bg-primary/5"
          >
            Xem tất cả
            <ChevronRight size={14} />
          </button>
        )}
      </aside>
    </>
  );
}