"use client";

import TopNavDrawer from "@/components/layout/TopNavDrawer";
import Icon from "@/components/ui/Icon";
import WishlistSidebar from "@/components/wishlist/WishlistSidebar";
import { useIsMounted } from "@/hooks/useIsMounted";
import { useCartStore } from "@/store";
import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
	const { openCart, itemCount } = useCartStore();
	const count = mounted ? itemCount() : 0;
	const [menuOpen, setMenuOpen] = useState(false);
	const [wishlistOpen, setWishlistOpen] = useState(false);
	const isCheckoutRoute = pathname?.startsWith("/checkout") ?? false;

	return (
		<nav
			className={clsx(
				"fixed top-0 w-full z-[51] bg-gray-50 flex justify-between items-center px-6 top-nav-pad",
				className,
			)}>
			<div className="flex items-center gap-4 w-10">
				{showBack ? (
					<Link
						href={backHref}
						className="text-on-surface hover:opacity-70 transition-opacity active:scale-95 duration-200">
						<Icon name="arrow_back" className="text-[22px]" />
					</Link>
				) : (
					<button
						aria-label="Open menu"
						aria-controls="topnav-menu"
						aria-expanded={menuOpen}
						onClick={() => setMenuOpen(true)}
						className="text-on-surface hover:opacity-70 transition-opacity active:scale-95 duration-200">
						<Icon name="menu" className="text-[22px]" />
					</button>
				)}
			</div>

			<h1 className="text-xl font-black tracking-tighter text-on-surface font-sans">
				{title}
			</h1>

			<div className="flex items-center gap-4 justify-end">
				{showFavorite && (
					<button
						onClick={() => setWishlistOpen(true)}
						className="text-on-surface hover:opacity-70 transition-opacity active:scale-95 duration-200">
						<Icon name="favorite" />
					</button>
				)}
				{showCart && !isCheckoutRoute && (
					<button
						onClick={openCart}
						className="relative text-on-surface hover:opacity-70 transition-opacity active:scale-95 duration-200">
						<Icon name="shopping_cart" className="text-[26px]" />
						{count > 0 && (
							<span className="absolute -top-1.5 -right-1.5 w-4.5 h-4.5 bg-primary text-white text-[9px] font-black rounded-full flex items-center justify-center min-w-[18px] min-h-[18px] px-1">
								{count}
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
	);
}
