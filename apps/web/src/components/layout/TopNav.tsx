"use client";

import { ArrowLeft, CircleHelp, Heart, Menu, ShoppingCart } from "lucide-react";
import { useIsMounted } from "@/hooks/useIsMounted";
import { useCartStore } from "@/modules/cart/client/useCartStore";
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
  import("@/modules/user/ui/wishlist/WishlistSidebar").then((m) => ({
    default: m.WishlistSidebar,
  }))
);

interface TopNavProps {
  title?: string;
  showBack?: boolean;
  backHref?: string;
  showCart?: boolean;
  showFavorite?: boolean;
  showHelp?: boolean;
  onHelpClick?: () => void;
  className?: string;
}

export function TopNav({
  title = "NoobStore",
  showBack = false,
  backHref = "/",
  showCart = true,
  showFavorite = false,
  showHelp = false,
  onHelpClick,
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
    <header
      className={clsx(
        "top-nav-pad fixed top-0 z-[51] w-full bg-surface md:hidden",
        className
      )}
    >
    <nav
      className="grid w-full grid-cols-3 items-center px-4"
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
              <ArrowLeft className="h-[22px] w-[22px]" />
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
              <Menu className="h-[22px] w-[22px]" />
            </span>
          </button>
        )}
      </div>

      <p className="text-center font-sans text-xl font-black tracking-tighter text-primary">
        {title}
      </p>

      <div className="flex items-center justify-end gap-4 justify-self-end">
        {showFavorite && (
          <button
            aria-label="Danh sách yêu thích"
            onClick={() => setWishlistOpen(true)}
            className="text-on-surface transition-opacity duration-200 hover:opacity-70 active:scale-95"
          >
            <Heart className="h-5 w-5" />
          </button>
        )}
        {showHelp ? (
          <button
            aria-label="Hướng dẫn sử dụng"
            onClick={onHelpClick}
            className="relative text-on-surface transition-opacity duration-200 hover:opacity-70 active:scale-95"
          >
            <span className="absolute -inset-1 animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite] rounded-full bg-primary/20" />
            <CircleHelp className="relative h-[22px] w-[22px]" />
          </button>
        ) : (
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
                <ShoppingCart className="h-[26px] w-[26px]" />
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
        )}
      </div>

      <TopNavDrawer open={menuOpen} onClose={() => setMenuOpen(false)} />
      {showFavorite ? (
        <WishlistSidebar
          drawerOpen={wishlistOpen}
          onClose={() => setWishlistOpen(false)}
        />
      ) : null}
    </nav>
    </header>
  );
}
