"use client";

import clsx from "clsx";
import { Dices, House, ShoppingBasket, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  {
    href: "/",
    icon: <House size={16} />,
    label: "Trang chủ",
    iconFilled: true,
  },
  {
    href: "/shop",
    icon: <ShoppingBasket size={16} />,
    label: "Cửa hàng",
    iconFilled: false,
  },
  {
    href: "/gacha",
    icon: <Dices size={16} />,
    label: "Gacha",
    iconFilled: false,
  },
  {
    href: "/profile",
    icon: <UserRound size={16} />,
    label: "Hồ sơ",
    iconFilled: false,
  },
];

export function BottomNav() {
  const pathname = usePathname();

  if (pathname === "/services") {
    return null;
  }

  return (
    <nav className="glass-nav fixed bottom-3 left-2 right-2 z-50 mx-auto flex w-full max-w-[70vw] items-center justify-between rounded-xl !bg-[rgba(255,255,255,0.5)] p-2">
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={clsx(
              "flex flex-col items-center justify-center rounded-lg px-2 py-1 transition-all duration-200 active:scale-90",
              isActive
                ? "bg-primary-fixed/60 text-primary"
                : "text-black opacity-50 hover:text-primary hover:opacity-100"
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
            <span className="font-sans text-[9px] font-semibold uppercase tracking-widest">
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
