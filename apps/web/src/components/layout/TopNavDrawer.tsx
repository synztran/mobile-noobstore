"use client";

import {
  Bell,
  Gavel,
  Heart,
  House,
  LogOut,
  Package,
  ShoppingBag,
  User,
} from "lucide-react";
import { usePreventScroll } from "@/hooks/usePreventScroll";
import { useAuth } from "@/modules/user/client/AuthProvider";
import { toast } from "@/lib/toast";
import clsx from "clsx";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";

interface TopNavDrawerProps {
  open: boolean;
  onClose: () => void;
}

type NavItem = {
  icon: ReactNode;
  label: string;
  href: string;
};

const NAV_ITEMS: NavItem[] = [
  { icon: <House size={18} />, label: "Trang chủ", href: "/" },
  { icon: <ShoppingBag size={18} />, label: "Cửa hàng", href: "/shop" },
  { icon: <Gavel size={18} />, label: "Đấu giá", href: "/auctions" },
  // { icon: "forum", label: "Cộng đồng", href: "/community" },
  // { icon: "paper", label: "Tài liệu", href: "/documents" },
  { icon: <User size={18} />, label: "Tài khoản người dùng", href: "/profile" },
  { icon: <Heart size={18} />, label: "Sản phẩm yêu thích", href: "/wishlist" },
  { icon: <Package size={18} />, label: "Đơn hàng", href: "/profile/orders" },
  { icon: <Bell size={18} />, label: "Thông báo", href: "/profile/notifications" },
];

const containerVariants = {
  show: {
    transition: { staggerChildren: 0.05, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  show: { opacity: 1, x: 0, transition: { duration: 0.2 } },
};

export default function TopNavDrawer({ open, onClose }: TopNavDrawerProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, signOut } = useAuth();

  usePreventScroll(open);

  const displayName =
    ([profile?.first_name, profile?.last_name].filter(Boolean).join(" ") ||
      user?.email?.split("@")[0]) ??
    "User";
  const initials = displayName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out");
    router.push("/login");
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="topnav-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[80] bg-on-surface/25"
        />
      )}

      {open && (
        <motion.aside
          key="topnav-drawer"
          id="topnav-menu"
          role="dialog"
          aria-modal="true"
          initial={{ x: "-100%" }}
          animate={{ x: 0 }}
          exit={{ x: "-100%" }}
          transition={{ type: "spring", damping: 30, stiffness: 250 }}
          className="fixed left-0 top-0 z-[81] flex h-full w-72 flex-col bg-surface shadow-ambient will-change-transform sm:w-80"
        >
          <div className="flex items-center justify-between px-4 pb-3 pt-[calc(env(safe-area-inset-top,0px)+1rem)]">
            <p className="text-lg font-black text-on-surface">Danh mục</p>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close menu"
              className="rounded-xl border border-outline-variant/40 bg-surface-container px-3 py-1.5 text-xs font-bold text-on-surface transition-colors active:scale-90"
            >
              Đóng
            </button>
          </div>

          {user ? (
            <div className="mx-4 mb-3 flex items-center gap-3 rounded-xl bg-surface-container-low p-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary-gradient">
                <span className="text-sm font-black text-white">
                  {initials}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-on-surface">
                  {displayName}
                </p>
                <p className="truncate text-xs text-on-surface-variant">
                  {user.email}
                </p>
              </div>
            </div>
          ) : (
            <div className="mx-4 mb-3 flex flex-col gap-2">
              <Link
                href="/login"
                onClick={onClose}
                className="rounded-xl bg-primary-gradient px-4 py-2.5 text-center text-sm font-bold text-white transition-transform active:scale-95"
              >
                Đăng nhập
              </Link>
              <Link
                href="/register"
                onClick={onClose}
                className="rounded-xl border border-outline-variant/40 bg-surface-container px-4 py-2.5 text-center text-sm font-bold text-on-surface transition-transform active:scale-95"
              >
                Tạo tài khoản
              </Link>
            </div>
          )}

          <div className="mx-4 border-t border-outline-variant/10" />

          <nav className="mt-2 flex-1 touch-pan-y overflow-y-auto">
            <motion.ul
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="flex flex-col gap-0.5 px-3"
            >
              {NAV_ITEMS.map(({ icon, label, href }) => {
                const isActive = pathname === href;
                return (
                  <motion.li key={href} variants={itemVariants}>
                    <Link
                      href={href}
                      onClick={onClose}
                      className={clsx(
                        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors hover:bg-surface-container-high",
                        isActive
                          ? "bg-primary-fixed/30 font-bold text-primary"
                          : "text-on-surface"
                      )}
                    >
                      <span
                        className={clsx(
                          "flex h-[18px] w-[18px] items-center justify-center",
                          isActive
                            ? "text-primary"
                            : "text-on-surface-variant"
                        )}
                      >
                        {icon}
                      </span>
                      {label}
                    </Link>
                  </motion.li>
                );
              })}
            </motion.ul>
          </nav>

          {user && (
            <div className="border-t border-outline-variant/10 px-3 py-3">
              <button
                type="button"
                onClick={handleSignOut}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-on-surface-variant transition-colors hover:text-error"
              >
                <LogOut className="h-[18px] w-[18px]" />
                Đăng xuất
              </button>
            </div>
          )}
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
