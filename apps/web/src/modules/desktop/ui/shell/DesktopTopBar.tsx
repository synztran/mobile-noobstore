"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ShoppingCart,
  Bell,
  ShoppingBasket,
  Dices,
  Gift,
  Users,
  UserRound,
  Package,
  Heart,
  LogOut,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useCartStore } from "@/modules/cart/client/hooks/useCartStore";
import { useIsMounted } from "@/hooks/useIsMounted";
import { useNotifications } from "@/lib/react-query/notification/api/useNotificationQueries";
import { useAuth } from "@/modules/user/client/AuthProvider";
import { DesktopNotificationsDrawer } from "@/modules/desktop/ui/notifications/DesktopNotificationsDrawer";
import { DesktopSearch } from "./DesktopSearch";
import { LOGO_NOOB_STORE } from "@/lib/images";
import { toast } from "@/lib/toast";

const ACCOUNT_LINKS = [
  { href: "/profile", label: "Hồ sơ", icon: UserRound },
  { href: "/profile/orders", label: "Đơn hàng", icon: Package },
  { href: "/wishlist", label: "Yêu thích", icon: Heart },
  { href: "/profile/points", label: "Điểm thưởng", icon: Gift },
] as const;

const PRIMARY_NAV = [
  { href: "/shop", icon: ShoppingBasket, label: "Cửa hàng" },
  { href: "/gacha", icon: Dices, label: "Gacha" },
  { href: "/rewards", icon: Gift, label: "Đổi thưởng" },
  { href: "/community", icon: Users, label: "Cộng đồng" },
];

export function DesktopTopBar() {
  const mounted = useIsMounted();
  const pathname = usePathname();
  const router = useRouter();
  const { openCart, itemCount, isHydrated, cartFetching } = useCartStore();
  const count = mounted ? itemCount() : 0;
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  const { user, profile, signOut } = useAuth();
  const { data: notifications } = useNotifications(!!user);
  const unreadCount =
    mounted && user
      ? (notifications?.filter((n) => !n.read_at).length ?? 0)
      : 0;

  const displayName =
    [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") ||
    user?.email?.split("@")[0] ||
    "";

  // Close the notification + account menus when navigation lands elsewhere.
  useEffect(() => {
    setNotificationsOpen(false);
    setAccountOpen(false);
  }, [pathname]);

  const handleSignOut = useCallback(async () => {
    setAccountOpen(false);
    await signOut();
    toast.success("Đã đăng xuất");
    router.push("/login");
  }, [router, signOut]);

  // Hide search on pages with their own search
  const searchHiddenPaths = ["/checkout", "/gacha", "/gacha-mega", "/shop"];
  const hideSearch = searchHiddenPaths.some((p) => pathname.startsWith(p));

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header className="fixed inset-x-0 top-0 z-30 flex h-16 items-center gap-3 border-b border-on-surface/10 bg-surface px-4 lg:gap-6 lg:px-8">
      {/* Brand */}
      <Link href="/" className="flex shrink-0 items-center gap-2">
        <span className="relative h-8 w-8 shrink-0">
          <Image
            src={LOGO_NOOB_STORE}
            fill
            sizes="32px"
            alt="NoobStore"
            className="rounded-full object-cover"
          />
        </span>
        <span className="hidden whitespace-nowrap text-lg font-black tracking-tight text-primary sm:block">
          NoobStore
        </span>
      </Link>

      {/* Primary navigation */}
      <nav
        aria-label="Điều hướng chính"
        className="hidden items-center gap-1 lg:flex"
      >
        {PRIMARY_NAV.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              data-tip={item.label}
              aria-current={active ? "page" : undefined}
              className={`tooltip tooltip-bottom flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-3 py-2 text-sm font-semibold transition-colors xl:px-3.5 ${
                active
                  ? "bg-primary-fixed text-primary"
                  : "text-on-surface-variant hover:bg-on-surface/5 hover:text-on-surface"
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              <span className="hidden xl:inline">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Search — takes the remaining space */}
      {!hideSearch && <DesktopSearch />}

      {/* Actions */}
      <div
        className={`ml-auto flex shrink-0 items-center gap-1 ${
          hideSearch ? "" : "lg:ml-0"
        }`}
      >
        <button
          onClick={openCart}
          className="tooltip tooltip-bottom relative rounded-full p-2.5 text-on-surface-variant transition-colors hover:bg-on-surface/5"
          aria-label="Giỏ hàng"
          data-tip="Giỏ hàng"
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
          className="tooltip tooltip-bottom relative rounded-full p-2.5 text-on-surface-variant transition-colors hover:bg-on-surface/5"
          aria-label="Thông báo"
          data-tip="Thông báo"
        >
          <Bell className="h-5 w-5" />
          {user && unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white">
              {unreadCount}
            </span>
          )}
        </button>

        {user ? (
          <div
            ref={accountRef}
            className="relative"
            onMouseEnter={() => setAccountOpen(true)}
            onMouseLeave={() => setAccountOpen(false)}
            onFocus={() => setAccountOpen(true)}
            onBlur={(event) => {
              if (!accountRef.current?.contains(event.relatedTarget as Node)) {
                setAccountOpen(false);
              }
            }}
          >
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={accountOpen}
              aria-controls="desktop-account-menu"
              aria-label="Tài khoản"
              data-tip={accountOpen ? undefined : "Tài khoản"}
              className={`${
                accountOpen ? "" : "tooltip tooltip-bottom"
              } relative flex h-10 w-10 items-center justify-center rounded-full border border-on-surface/10 text-sm font-black text-on-surface transition-colors hover:border-primary hover:text-primary`}
            >
              <UserRound className="h-5 w-5" aria-hidden="true" />
            </button>

            <AnimatePresence>
              {accountOpen && (
                <motion.div
                  id="desktop-account-menu"
                  role="menu"
                  aria-label="Tài khoản"
                  initial={
                    reduceMotion
                      ? { opacity: 0 }
                      : { opacity: 0, y: -6, scale: 0.97 }
                  }
                  animate={
                    reduceMotion
                      ? { opacity: 1 }
                      : { opacity: 1, y: 0, scale: 1 }
                  }
                  exit={
                    reduceMotion
                      ? { opacity: 0 }
                      : { opacity: 0, y: -6, scale: 0.97 }
                  }
                  transition={{ duration: 0.16, ease: [0.23, 1, 0.32, 1] }}
                  style={{ transformOrigin: "top right" }}
                  className="absolute right-0 top-full z-50 w-60 overflow-hidden rounded-2xl border border-on-surface/10 bg-surface shadow-xl shadow-on-surface/10"
                >
                  <div className="border-b border-on-surface/10 px-4 py-3">
                    <p className="truncate text-sm font-bold text-on-surface">
                      {displayName || "Tài khoản"}
                    </p>
                    {user.email && (
                      <p className="truncate text-xs text-on-surface-variant">
                        {user.email}
                      </p>
                    )}
                  </div>

                  <div className="p-1.5">
                    {ACCOUNT_LINKS.map((item) => {
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          role="menuitem"
                          onClick={() => setAccountOpen(false)}
                          className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container-high focus-visible:bg-surface-container-high focus-visible:outline-none"
                        >
                          <Icon
                            className="h-4 w-4 text-on-surface-variant"
                            aria-hidden="true"
                          />
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>

                  <div className="border-t border-on-surface/10 p-1.5">
                    <button
                      type="button"
                      role="menuitem"
                      onClick={handleSignOut}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-semibold text-error transition-colors hover:bg-error/10 focus-visible:bg-error/10 focus-visible:outline-none"
                    >
                      <LogOut className="h-4 w-4" aria-hidden="true" />
                      Đăng xuất
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <div
            ref={accountRef}
            className="relative ml-1"
            onMouseEnter={() => setAccountOpen(true)}
            onMouseLeave={() => setAccountOpen(false)}
            onFocus={() => setAccountOpen(true)}
            onBlur={(event) => {
              if (!accountRef.current?.contains(event.relatedTarget as Node)) {
                setAccountOpen(false);
              }
            }}
          >
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={accountOpen}
              aria-controls="desktop-guest-account-menu"
              aria-label="Tài khoản"
              data-tip={accountOpen ? undefined : "Tài khoản"}
              className={`${
                accountOpen ? "" : "tooltip tooltip-bottom"
              } flex h-10 w-10 items-center justify-center rounded-full border border-on-surface/10 text-on-surface transition-colors hover:border-primary hover:text-primary`}
            >
              <UserRound className="h-5 w-5" aria-hidden="true" />
            </button>

            <AnimatePresence>
              {accountOpen && (
                <motion.div
                  id="desktop-guest-account-menu"
                  role="menu"
                  aria-label="Tài khoản"
                  initial={
                    reduceMotion
                      ? { opacity: 0 }
                      : { opacity: 0, y: -6, scale: 0.97 }
                  }
                  animate={
                    reduceMotion
                      ? { opacity: 1 }
                      : { opacity: 1, y: 0, scale: 1 }
                  }
                  exit={
                    reduceMotion
                      ? { opacity: 0 }
                      : { opacity: 0, y: -6, scale: 0.97 }
                  }
                  transition={{ duration: 0.16, ease: [0.23, 1, 0.32, 1] }}
                  style={{ transformOrigin: "top right" }}
                  className="absolute right-0 top-full z-50 w-48 overflow-hidden rounded-2xl border border-primary/20 bg-surface p-1.5 shadow-xl shadow-on-surface/15"
                >
                  <Link
                    href="/login"
                    role="menuitem"
                    onClick={() => setAccountOpen(false)}
                    className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-bold text-on-surface transition-colors hover:bg-primary/10 hover:text-primary focus-visible:bg-primary/10 focus-visible:outline-none"
                  >
                    <UserRound
                      className="h-4 w-4 text-on-surface-variant"
                      aria-hidden="true"
                    />
                    Đăng nhập
                  </Link>
                  <div className="mx-2 my-1 border-t border-outline-variant/50" />
                  <Link
                    href="/register"
                    role="menuitem"
                    onClick={() => setAccountOpen(false)}
                    className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-bold text-primary transition-colors hover:bg-primary/10 focus-visible:bg-primary/10 focus-visible:outline-none"
                  >
                    <Users
                      className="h-4 w-4 text-on-surface-variant"
                      aria-hidden="true"
                    />
                    Đăng ký
                  </Link>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      <DesktopNotificationsDrawer
        open={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
      />
    </header>
  );
}
