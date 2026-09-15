"use client";

import type { NotificationItem } from "@/app/api/notifications/route";
import { useRouter } from "next/navigation";
import { memo } from "react";

interface NotificationListProps {
  items?: NotificationItem[];
  isLoading: boolean;
  onMarkRead: (id: string) => void;
}

function NotificationList({ items, isLoading, onMarkRead }: NotificationListProps) {
  const router = useRouter();

  if (isLoading) {
    return (
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
    );
  }

  if (!items || items.length === 0) {
    return (
      <div className="rounded-2xl bg-surface-container-lowest p-8 text-center text-sm text-on-surface-variant">
        Chưa có thông báo nào.
      </div>
    );
  }

  const handleClick = (item: NotificationItem) => {
    onMarkRead(item.id);
    if (item.deep_link) {
      router.push(item.deep_link);
    }
  };

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <button
          type="button"
          key={item.id}
          onClick={() => handleClick(item)}
          className={`w-full rounded-2xl p-4 text-left transition-colors ${
            item.read_at
              ? "bg-surface-container"
              : "border border-primary/25 bg-surface-container-lowest"
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-black text-on-surface">{item.title}</p>
            {!item.read_at && (
              <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
            )}
          </div>
          <p className="mt-1 text-xs text-on-surface-variant">{item.body}</p>
          <p className="mt-2 text-[10px] uppercase tracking-wider text-on-surface-variant">
            {new Date(item.created_at).toLocaleString("vi-VN")}
          </p>
        </button>
      ))}
    </div>
  );
}

export default memo(NotificationList);