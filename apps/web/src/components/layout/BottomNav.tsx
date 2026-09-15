"use client";

import clsx from "clsx";
import { Dices, Gift, House, ShoppingBasket, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  {
    href: "/",
    icon: <House size={24} />,
    label: "Trang chủ",
    iconFilled: true,
  },
  {
    href: "/shop",
    icon: <ShoppingBasket size={24} />,
    label: "Cửa hàng",
    iconFilled: false,
  },
  {
    href: "/gacha",
    icon: <Dices size={24} />,
    label: "Gacha",
    iconFilled: false,
  },
  {
    href: "/rewards",
    icon: <Gift size={24} />,
    label: "Đổi thưởng",
    iconFilled: false,
  },
  {
    href: "/profile",
    icon: <UserRound size={24} />,
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
    "/gacha-mega",
    "/profile/support",
    "/community",
    "/documents",
  ];

  if (excludedPaths.some((path) => pathname.startsWith(path))) {
    return null;
  }

  const isShopDetail = /^\/shop\/.+$/.test(pathname);
  if (isShopDetail) {
    return null;
  }

  return (
    <nav className="glass-nav fixed bottom-5 left-2 right-2 z-50 mx-auto flex w-full max-w-[90dvw] items-center justify-between rounded-xl border-gray-200/30 p-2 shadow-lg">
      {navItems.map((item) => {
        const isActive =
          pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={clsx(
              "flex min-h-[44px] flex-1 touch-manipulation select-none flex-col items-center justify-center gap-1 rounded-lg p-2 transition-all duration-200 active:scale-90",
              isActive
                ? "bg-primary-fixed text-primary"
                : "text-on-surface-variant hover:text-primary"
            )}
          >
            {
              <div
                className={clsx(
                  isActive && item.iconFilled && "icon-filled",
                  ""
                )}
              >
                {item.icon}
              </div>
            }
            <span className="truncate whitespace-nowrap text-[12px] font-semibold leading-tight">
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
