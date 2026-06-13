"use client";

import TopNavDrawer from "@/components/layout/TopNavDrawer";
import Icon from "@/components/ui/Icon";
import WishlistSidebar from "@/components/wishlist/WishlistSidebar";
import { useIsMounted } from "@/hooks/useIsMounted";
import { useCartStore } from "@/store";
import clsx from "clsx";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

interface TopNavProps {
  title?: string;
  showBack?: boolean;
  backHref?: string;
  showCart?: boolean;
  showFavorite?: boolean;
  className?: string;
}

export function TopNav({
  title = "NoobStore",
  showBack = false,
  backHref = "/",
  showCart = true,
  showFavorite = false,
  className,
}: TopNavProps) {
  const mounted = useIsMounted();
  const pathname = usePathname();
  const router = useRouter();
  const { openCart, itemCount } = useCartStore();
  const count = mounted ? itemCount() : 0;
  const [menuOpen, setMenuOpen] = useState(false);
  const [wishlistOpen, setWishlistOpen] = useState(false);
  const [navigating, setNavigating] = useState(false);

  const handleBack = () => {
    setNavigating(true);
    router.push(backHref);
  };
  const pathHideCart = ["/gacha", "/checkout"];
  const hideCart =
    pathHideCart.includes(pathname) ||
    pathHideCart.some((path) => pathname.startsWith(path));

  return (
    <nav
      className={clsx(
        "top-nav-pad fixed top-0 z-[51] flex w-full items-center justify-between bg-gray-50 px-6",
        className
      )}
    >
      <div className="flex w-10 items-center gap-4">
        {showBack ? (
          <button
            aria-label="Go back"
            disabled={navigating}
            onClick={handleBack}
            className="text-on-surface transition-opacity duration-200 hover:opacity-70 active:scale-95 disabled:opacity-40"
          >
            {navigating ? (
              <span className="loading loading-spinner loading-xs" />
            ) : (
              <Icon name="arrow_back" className="text-[22px]" />
            )}
          </button>
        ) : (
          <button
            aria-label="Open menu"
            aria-controls="topnav-menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(true)}
            className="text-on-surface transition-opacity duration-200 hover:opacity-70 active:scale-95"
          >
            <Icon name="menu" className="text-[22px]" />
          </button>
        )}
      </div>

      <h1 className="font-sans text-xl font-black tracking-tighter text-on-surface">
        {title}
      </h1>

      <div className="flex items-center justify-end gap-4">
        {showFavorite && (
          <button
            onClick={() => setWishlistOpen(true)}
            className="text-on-surface transition-opacity duration-200 hover:opacity-70 active:scale-95"
          >
            <Icon name="favorite" />
          </button>
        )}
        <button
          disabled={hideCart}
          onClick={openCart}
          className={`relative text-on-surface transition-opacity duration-200 hover:opacity-70 active:scale-95 ${hideCart ? "cursor-not-allowed opacity-0" : ""}`}
        >
          <Icon name="shopping_cart" className="text-[26px]" />
          {count > 0 && (
            <span className="w-4.5 h-4.5 absolute -right-1.5 -top-1.5 flex min-h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[9px] font-black text-white">
              {count}
            </span>
          )}
        </button>
      </div>

      <TopNavDrawer open={menuOpen} onClose={() => setMenuOpen(false)} />
      {showFavorite ? (
        <WishlistSidebar
          drawerOpen={wishlistOpen}
          onClose={() => setWishlistOpen(false)}
        />
      ) : null}
    </nav>
  );
}
