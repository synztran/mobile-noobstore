"use client";

import clsx from "clsx";
import { Dices, Gift, House, ShoppingBasket, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  {
    href: "/",
    icon: <House size={20} />,
    label: "Trang chủ",
    iconFilled: true,
  },
  {
    href: "/shop",
    icon: <ShoppingBasket size={20} />,
    label: "Cửa hàng",
    iconFilled: false,
  },
  {
    href: "/gacha",
    icon: <Dices size={20} />,
    label: "Gacha",
    iconFilled: false,
  },
  {
    href: "/rewards",
    icon: <Gift size={20} />,
    label: "Đổi thưởng",
    iconFilled: false,
  },
  {
    href: "/profile",
    icon: <UserRound size={20} />,
    label: "Hồ sơ",
    iconFilled: false,
  },
];

export function BottomNav() {
  const pathname = usePathname();
  const excludedPaths = [
    "/checkout",
    "/services",
    "/gacha",
    "/profile/support",
    "/community",
    "/documents",
  ];

  if (excludedPaths.some((path) => pathname.startsWith(path))) {
    return null;
  }

  return (
    <nav className="glass-nav fixed bottom-5 left-2 right-2 z-50 mx-auto flex w-full max-w-[95dvw] items-center justify-between rounded-xl border-gray-200/30 !bg-[rgba(255,255,255,0.8)] p-2 shadow-lg">
      {navItems.map((item) => {
        const isActive =
          pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            className={clsx(
              "flex touch-manipulation select-none flex-col items-center justify-center rounded-lg px-2 py-1 transition-all duration-200 active:scale-90",
              isActive
                ? "bg-primary-fixed text-primary"
                : "text-on-surface-variant hover:text-primary"
            )}
          >
            {
              <div
                className={clsx(
                  isActive && item.iconFilled && "icon-filled",
                  "mb-1"
                )}
              >
                {item.icon}
              </div>
            }
            <span className="text-[10px] font-semibold uppercase tracking-wide">
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
