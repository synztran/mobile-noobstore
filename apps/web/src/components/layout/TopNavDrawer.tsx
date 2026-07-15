"use client";

import Icon from "@/components/ui/Icon";
import { usePreventScroll } from "@/hooks/usePreventScroll";
import { useAuth } from "@/lib/auth/AuthProvider";
import { toast } from "@/lib/toast";
import clsx from "clsx";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

interface TopNavDrawerProps {
  open: boolean;
  onClose: () => void;
}

const NAV_ITEMS = [
  { icon: "home", label: "Trang chủ", href: "/" },
  { icon: "shopping_bag", label: "Cửa hàng", href: "/shop" },
  { icon: "person", label: "Tài khoản người dùng", href: "/profile" },
  { icon: "favorite", label: "Sản phẩm yêu thích", href: "/wishlist" },
  { icon: "inventory_2", label: "Đơn hàng", href: "/profile/orders" },
  { icon: "notifications", label: "Thông báo", href: "/profile/notifications" },
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
          className="fixed inset-0 z-[80] bg-on-surface/25 backdrop-blur-sm"
          onClick={onClose}
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
          className="fixed left-0 top-0 z-[81] flex h-full w-72 flex-col bg-surface shadow-ambient sm:w-80"
        >
          <div className="flex items-center justify-between px-4 pb-3 pt-[calc(env(safe-area-inset-top,0px)+1rem)]">
            <p className="text-lg font-black text-on-surface">Danh mục</p>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close menu"
              className="rounded-xl border border-outline-variant/40 bg-surface-container px-3 py-1.5 text-xs font-bold text-on-surface transition-all active:scale-90"
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
                className="rounded-xl bg-primary-gradient px-4 py-2.5 text-center text-sm font-bold text-white transition-all active:scale-95"
              >
                Đăng nhập
              </Link>
              <Link
                href="/register"
                onClick={onClose}
                className="rounded-xl border border-outline-variant/40 bg-surface-container px-4 py-2.5 text-center text-sm font-bold text-on-surface transition-all active:scale-95"
              >
                Tạo tài khoản
              </Link>
            </div>
          )}

          <div className="mx-4 border-t border-outline-variant/10" />

          <nav className="mt-2 flex-1 overflow-y-auto">
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
                        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all hover:bg-surface-container-high",
                        isActive
                          ? "bg-primary-fixed/30 font-bold text-primary"
                          : "text-on-surface"
                      )}
                    >
                      <Icon
                        name={icon}
                        className={clsx(
                          "text-[18px]",
                          isActive
                            ? "text-primary"
                            : "text-on-surface-variant"
                        )}
                      />
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
                <Icon name="logout" className="text-[18px]" />
                Đăng xuất
              </button>
            </div>
          )}
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
