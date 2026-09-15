"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import clsx from "clsx";
import {
  House,
  ShoppingBasket,
  Dices,
  Gift,
  UserRound,
  Package,
  Heart,
  Users,
  FileText,
  Headphones,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import Image from "next/image";
import { LOGO_NOOB_STORE } from "@/lib/images";

const PRIMARY_NAV = [
  { href: "/", icon: House, label: "Trang chủ" },
  { href: "/shop", icon: ShoppingBasket, label: "Cửa hàng" },
  { href: "/gacha", icon: Dices, label: "Gacha" },
  { href: "/rewards", icon: Gift, label: "Đổi thưởng" },
  { href: "/profile", icon: UserRound, label: "Hồ sơ" },
];

const SECONDARY_NAV = [
  { href: "/profile/points", icon: Package, label: "Đơn hàng" },
  { href: "/wishlist", icon: Heart, label: "Yêu thích" },
  { href: "/community", icon: Users, label: "Cộng đồng" },
  { href: "/blogs", icon: FileText, label: "Blog" },
  { href: "/profile/support", icon: Headphones, label: "Hỗ trợ" },
];

export function DesktopSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <aside
      className={clsx(
        "fixed left-0 top-0 z-40 flex h-full flex-col border-r border-on-surface/10 bg-surface transition-[width] duration-200",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b border-on-surface/10 px-4">
        <Link href="/" className="flex shrink-0 items-center gap-2 overflow-hidden">
          {/* 32px logo fits the collapsed 64px rail (px-4 padding) exactly —
              a 40px box overflowed the link and clipped the circle's edge. */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="relative h-8 w-8 shrink-0"
          >
            <Image
              src={LOGO_NOOB_STORE}
              fill
              sizes="32px"
              alt="ns logo"
              className="rounded-full object-cover"
            />
          </motion.div>
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                className="overflow-hidden whitespace-nowrap text-lg font-black tracking-tight text-primary"
              >
                NoobStore
              </motion.span>
            )}
          </AnimatePresence>
        </Link>
      </div>

      {/* Primary nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        <ul className="space-y-1">
          {PRIMARY_NAV.map((item) => {
            const active = isActive(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={clsx(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-on-surface-variant hover:bg-on-surface/5 hover:text-on-surface"
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  <AnimatePresence>
                    {!collapsed && (
                      <motion.span
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: "auto" }}
                        exit={{ opacity: 0, width: 0 }}
                        className="overflow-hidden whitespace-nowrap"
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Divider */}
        <div className="my-3 border-t border-on-surface/10" />

        {/* Secondary nav */}
        <ul className="space-y-1">
          {SECONDARY_NAV.map((item) => {
            const active = isActive(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={clsx(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-on-surface-variant hover:bg-on-surface/5 hover:text-on-surface"
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  <AnimatePresence>
                    {!collapsed && (
                      <motion.span
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: "auto" }}
                        exit={{ opacity: 0, width: 0 }}
                        className="overflow-hidden whitespace-nowrap"
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Collapse toggle — visible at every desktop-class width (tablets
          included): `lg:hidden` hid it on ≥1024px screens, where tablets land. */}
      <div className="border-t border-on-surface/10 p-2">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm text-on-surface-variant transition-colors hover:bg-on-surface/5"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4" />
              <span>Thu gọn</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
