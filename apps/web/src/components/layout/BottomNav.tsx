"use client";

import clsx from "clsx";
import { House, ShoppingBasket, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
	{ href: "/", icon: <House size={16} />, label: "Trang chủ", iconFilled: true },
	{
		href: "/shop",
		icon: <ShoppingBasket size={16} />,
		label: "Cửa hàng",
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

	return (
		<nav className="fixed bottom-3 left-2 right-2 w-full flex justify-around items-center glass-nav !bg-[rgba(255,255,255,0.5)] rounded-xl z-50 bottom-nav-pad max-w-[80vw] mx-auto">
			{navItems.map((item) => {
				const isActive = pathname === item.href;
				return (
					<Link
						key={item.href}
						href={item.href}
						className={clsx(
							"flex flex-col items-center justify-center rounded-lg px-2 py-1 transition-all active:scale-90 duration-200",
							isActive
								? "text-primary bg-primary-fixed/60"
								: "text-black opacity-50 hover:text-primary hover:opacity-100",
						)}>
						{
							<div
								className={clsx(
									isActive &&
										item.iconFilled &&
										"icon-filled",
									"mb-1",
								)}>
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
