"use client";

import { useAuth } from "@/lib/auth/AuthProvider";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { Bell, X } from "lucide-react";
import { useEffect, useState } from "react";

const STORAGE_KEY = "noobstore-push-prompt-dismissed";

export function PushNotificationPrompt() {
  const { user, loading: authLoading } = useAuth();
  const { isSupported, loading, subscribe, permission } =
    usePushNotifications();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) return;
    if (!isSupported) return;
    if (permission === "granted") return;
    if (permission === "denied") return;
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (dismissed === "true") return;
    const timer = setTimeout(() => setVisible(true), 3000);
    return () => clearTimeout(timer);
  }, [isSupported, permission, user, authLoading]);

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    setVisible(false);
  };

  const handleSubscribe = async () => {
    const ok = await subscribe();
    if (ok) setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-24 left-4 right-4 z-[1000] animate-slide-up">
      <div className="relative rounded-2xl bg-surface px-4 pb-4 pt-3 shadow-ambient-lg">
        <button
          aria-label="Đóng"
          onClick={handleDismiss}
          className="absolute right-3 top-3 rounded-full p-1 text-on-surface-variant transition-colors hover:bg-surface-container active:scale-90"
        >
          <X size={16} />
        </button>
        <div className="mb-2 flex items-center gap-2">
          <Bell size={18} className="text-primary" />
          <p className="text-sm font-black text-on-surface">
            Nhận thông báo đơn hàng
          </p>
        </div>
        <p className="mb-3 text-xs leading-relaxed text-on-surface-variant">
          Bật thông báo để nhận cập nhật trạng thái đơn hàng và khuyến mãi mới
          nhất từ NoobStore.
        </p>
        <div className="flex gap-2">
          <button
            onClick={handleSubscribe}
            disabled={loading}
            className="flex-1 rounded-xl bg-primary px-4 py-2.5 text-sm font-black text-white transition-transform active:scale-95 disabled:opacity-60"
          >
            {loading ? "Đang bật…" : "Bật thông báo"}
          </button>
          <button
            onClick={handleDismiss}
            className="rounded-xl bg-surface-container px-4 py-2.5 text-sm font-medium text-on-surface-variant transition-transform active:scale-95"
          >
            Để sau
          </button>
        </div>
      </div>
    </div>
  );
}
