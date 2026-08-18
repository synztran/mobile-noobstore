"use client";

import Icon from "@/components/ui/Icon";
import { useIsMounted } from "@/hooks/useIsMounted";
import { useCartStore } from "@/store";
import clsx from "clsx";
import dynamic from "next/dynamic";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useState } from "react";

const TopNavDrawer = dynamic(
  () =>
    import("@/components/layout/TopNavDrawer").then((m) => ({
      default: m.default,
    })),
  { ssr: false }
);
const WishlistSidebar = dynamic(() =>
  import("@/components/wishlist/WishlistSidebar").then((m) => ({
    default: m.WishlistSidebar,
  }))
);

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
  const { openCart, itemCount, isHydrated, cartFetching } = useCartStore();
  const count = mounted ? itemCount() : 0;
  const [menuOpen, setMenuOpen] = useState(false);
  const [wishlistOpen, setWishlistOpen] = useState(false);
  const [navigating, setNavigating] = useState(false);
  const [cartBounce, setCartBounce] = useState(0);
  const [menuBounce, setMenuBounce] = useState(0);

  const handleCartClick = useCallback(() => {
    openCart();
    setCartBounce((n) => n + 1);
  }, [openCart]);

  const handleMenuClick = useCallback(() => {
    setMenuOpen(true);
    setMenuBounce((n) => n + 1);
  }, []);

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
        "top-nav-pad fixed top-0 z-[51] grid w-full grid-cols-3 items-center bg-gray-50 px-4",
        className
      )}
    >
      <div className="clear-both relative">
        {showBack ? (
          <button
            aria-label="Go back"
            disabled={navigating}
            onClick={handleBack}
            className="text-on-surface transition-opacity duration-200 hover:opacity-70 active:scale-95 disabled:opacity-40 flex items-center"
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
            onClick={handleMenuClick}
            className="text-on-surface transition-opacity duration-200 hover:opacity-70 active:scale-95 flex items-center"
          >
            <span
              key={menuBounce}
              className="inline-flex animate-[icon-bounce_0.35s_ease-out]"
            >
              <Icon name="menu" className="text-[22px]" />
            </span>
          </button>
        )}
      </div>

      <p className="bg-gradient-to-br from-[#9b3f1c] to-[#bb5732] bg-clip-text text-center font-sans text-xl font-black tracking-tighter text-transparent">
        {title}
      </p>

      <div className="flex items-center justify-end gap-4 justify-self-end">
        {showFavorite && (
          <button
            aria-label="Danh sách yêu thích"
            onClick={() => setWishlistOpen(true)}
            className="text-on-surface transition-opacity duration-200 hover:opacity-70 active:scale-95"
          >
            <Icon name="favorite" />
          </button>
        )}
        <button
          aria-label="Giỏ hàng"
          disabled={hideCart}
          onClick={handleCartClick}
          data-cart-icon
          className={`relative text-on-surface transition-opacity duration-200 hover:opacity-70 active:scale-95 flex items-center ${hideCart ? "cursor-not-allowed opacity-0" : ""}`}
        >
          {!isHydrated && showCart && !hideCart ? (
            <div className="skeleton h-[26px] w-[26px] rounded-full" />
          ) : cartFetching ? (
            <span className="loading loading-spinner loading-sm" />
          ) : (
            <span
              key={cartBounce}
              className="inline-flex animate-[icon-bounce_0.35s_ease-out] "
            >
              <Icon name="shopping_cart" className="text-[26px]" />
              {count > 0 && (
                <span
                  aria-hidden="true"
                  className="w-4.5 h-4.5 absolute -right-1.5 -top-1.5 flex min-h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[9px] font-black text-white"
                >
                  {count}
                </span>
              )}
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
