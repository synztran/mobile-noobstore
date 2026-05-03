"use client";

import Icon from "@/components/ui/Icon";
import { useIsMounted } from "@/hooks/useIsMounted";
import { useCartStore, useCheckoutStore } from "@/store";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function CheckoutLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const pathname = usePathname();
	const mounted = useIsMounted();
	const cartId = useCartStore((s) => s.cartId);
	const orderId = useCheckoutStore((s) => s.orderId);

	const steps = [
		{
			href: "/checkout/shipping",
			icon: "local_shipping",
			label: "Vận chuyển",
			step: 1,
		},
		{
			href: "/checkout/summary",
			icon: "summary",
			label: "Kiểm tra",
			step: 2,
		},
		{
			href: orderId
				? `/checkout/checking/${orderId}`
				: "/checkout/checking",
			icon: "rate_review",
			label: "Xác nhận",
			step: 3,
		},
	];

	const currentStep = steps.findIndex((s) =>
		pathname.includes(s.href.split("/")[2]),
	);

	return (
		<div className="min-h-screen bg-background">
			{/* TopAppBar */}
			<nav className="fixed top-0 w-full z-50">
				<div className="glass-nav flex items-center justify-between px-6 top-nav-pad">
					<Link
						href="/"
						className="hover:opacity-70 transition-opacity active:scale-95 duration-200">
						<Icon name="arrow_back" className="text-primary" />
					</Link>
					<h1 className="font-sans font-bold tracking-tight uppercase text-lg text-on-surface">
						CHECKOUT
					</h1>
					<Link
						href="/shop"
						className="hover:opacity-70 transition-opacity active:scale-95 duration-200">
						<Icon name="shopping_bag" className="text-primary" />
					</Link>
				</div>

				{/* DaisyUI Steps bar */}
				<div className="glass-nav border-t border-outline-variant/10 px-4 py-2">
					{!mounted ? (
						<div className="flex justify-around w-full py-1 animate-pulse">
							{[1, 2, 3].map((i) => (
								<div key={i} className="h-4 w-16 bg-surface-container rounded-full" />
							))}
						</div>
					) : (
						<ul className="steps steps-horizontal w-full">
							{steps.map(({ href, label, step }) => {
								const idx = step - 1;
								const isPast = idx < currentStep;
								const isActive = idx === currentStep;
								const canNavigate = isPast && currentStep !== 3;

								return (
									<li
										key={href}
										data-content={isPast ? "✓" : String(step)}
										className={[
											"step text-[10px] font-bold uppercase tracking-widest",
											isPast || isActive ? "step-primary" : "",
										]
											.filter(Boolean)
											.join(" ")}>
										{canNavigate ? (
											<Link
												href={href}
												className="flex flex-col items-center gap-0.5">
												{label}
											</Link>
										) : (
											<span className="flex flex-col items-center gap-0.5">
												{label}
											</span>
										)}
									</li>
								);
							})}
						</ul>
					)}
				</div>
			</nav>

			<main className="mt-40 pb-18 px-4 w-full mx-auto">{children}</main>
		</div>
	);
}
