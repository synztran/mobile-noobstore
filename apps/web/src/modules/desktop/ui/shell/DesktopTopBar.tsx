"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Search, ShoppingCart, Bell, Menu } from "lucide-react";
import { useCartStore } from "@/modules/cart/client/useCartStore";
import { useIsMounted } from "@/hooks/useIsMounted";
import { useNotifications } from "@/lib/react-query/notification/api/useNotificationQueries";
import { useAuth } from "@/modules/user/client/AuthProvider";
import { DesktopNotificationsDrawer } from "@/modules/desktop/ui/notifications/DesktopNotificationsDrawer";
import dynamic from "next/dynamic";

const TopNavDrawer = dynamic(
  () =>
    import("@/components/layout/TopNavDrawer").then((m) => ({
      default: m.default,
    })),
  { ssr: false }
);

interface DesktopTopBarProps {
  sidebarWidth: number;
}

export function DesktopTopBar({ sidebarWidth }: DesktopTopBarProps) {
  const mounted = useIsMounted();
  const pathname = usePathname();
  const router = useRouter();
  const { openCart, itemCount, isHydrated, cartFetching } = useCartStore();
  const count = mounted ? itemCount() : 0;
  const [menuOpen, setMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const { user } = useAuth();
  const { data: notifications } = useNotifications(!!user);
  const unreadCount =
    mounted && user
      ? (notifications?.filter((n) => !n.read_at).length ?? 0)
      : 0;

  // Close the notification drawer when navigation lands elsewhere.
  useEffect(() => {
    setNotificationsOpen(false);
  }, [pathname]);

  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (searchQuery.trim()) {
        router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      }
    },
    [searchQuery, router]
  );

  // Hide search on pages with their own search
  const searchHiddenPaths = ["/checkout", "/gacha", "/gacha-mega", "/shop"];
  const hideSearch = searchHiddenPaths.some((p) => pathname.startsWith(p));

  return (
    <header
      className="fixed right-0 top-0 z-30 flex h-16 items-center gap-4 border-b border-on-surface/10 bg-surface px-6"
      style={{ left: sidebarWidth }}
    >
      {/* Left balance spacer — the search centers on the header, the action
          buttons are pinned flush to the right edge. */}
      {/* <div className="flex-1" /> */}

      {/* Center: Search */}
      {!hideSearch && (
        <form
          onSubmit={handleSearch}
          className="relative w-full min-w-0 max-w-3xl flex-1"
        >
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
          <input
            type="text"
            placeholder="Tìm kiếm bàn phím, keycap, switch..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-on-surface/10 bg-surface-container-low py-2.5 pl-10 pr-4 text-sm text-on-surface transition-colors placeholder:text-on-surface-variant/50 focus:border-primary focus:outline-none"
          />
        </form>
      )}

      {/* Right: Cart + Notifications, pinned to the right edge */}
      <div className="flex flex-1 items-center justify-end gap-2">
        <button
          onClick={openCart}
          className="relative rounded-lg p-2.5 text-on-surface-variant transition-colors hover:bg-on-surface/5"
          aria-label="Giỏ hàng"
        >
          {!isHydrated ? (
            <div className="h-5 w-5 rounded-full bg-on-surface/10" />
          ) : cartFetching ? (
            <span className="loading loading-spinner loading-sm" />
          ) : (
            <>
              <ShoppingCart className="h-5 w-5" />
              {count > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white">
                  {count}
                </span>
              )}
            </>
          )}
        </button>

        <button
          onClick={() => setNotificationsOpen(true)}
          className="relative rounded-lg p-2.5 text-on-surface-variant transition-colors hover:bg-on-surface/5"
          aria-label="Thông báo"
        >
          <Bell className="h-5 w-5" />
          {user && unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white">
              {unreadCount}
            </span>
          )}
        </button>

        {/* <button
          onClick={() => setMenuOpen(true)}
          className="rounded-lg p-2.5 text-on-surface-variant transition-colors hover:bg-on-surface/5 lg:hidden"
          aria-label="Menu"
        >
          <Menu className="h-5 w-5" />
        </button> */}
      </div>

      <TopNavDrawer open={menuOpen} onClose={() => setMenuOpen(false)} />
      <DesktopNotificationsDrawer
        open={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
      />
    </header>
  );
}
